import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LanguageDomain,
  CheckMatch,
  SpellChecker,
  DictionaryResolver,
  LanguageServiceClient,
} from '@cybelinx/language';
import { useDebounce } from '../hooks/useDebounce';
import { SuggestionPopover } from '../components/SuggestionPopover';

export interface SmartTextEditorProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  domain?: LanguageDomain;
  tenantId?: string;
  userId?: string;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  minRows?: number;
  spellCheck?: boolean;
  grammarCheck?: boolean;
  debounceGrammarMs?: number;
  className?: string;
  style?: React.CSSProperties;
  onSuggestionAccepted?: (word: string, replacement: string) => void;
  onErrorStateChange?: (isDegraded: boolean) => void;
  ariaLabel?: string;
}

export const SmartTextEditor: React.FC<SmartTextEditorProps> = ({
  id,
  name,
  value,
  onChange,
  domain = 'healthcare',
  tenantId,
  userId,
  placeholder = 'Type here...',
  readOnly = false,
  disabled = false,
  minRows = 4,
  spellCheck = true,
  grammarCheck = true,
  debounceGrammarMs = 800,
  className = '',
  style,
  onSuggestionAccepted,
  onErrorStateChange,
  ariaLabel = 'Smart text editor',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active popover state
  const [activeMatch, setActiveMatch] = useState<CheckMatch | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Status indicators
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);

  // 1. Initialize Dictionary & Spell Checker
  const resolver = useMemo(() => {
    const res = new DictionaryResolver();
    // Default baseline domain terms
    res.loadCommonDictionary([
      'patient', 'doctor', 'hospital', 'clinic', 'report', 'appointment', 'notes',
      'employee', 'manager', 'assessment', 'status', 'approved', 'pending'
    ]);
    res.loadDomainDictionary('healthcare', [
      'ABHA', 'ABDM', 'MRN', 'UHID', 'OPD', 'IPD', 'HbA1c', 'HTN', 'CAD', 'COPD',
      'T2DM', 'Dyspnea', 'Metformin', 'Paracetamol', 'SNOMED', 'ICD-10', 'Amoxicillin'
    ]);
    res.loadDomainDictionary('hrms', [
      'HRMS', 'KPI', 'KRA', 'OKR', 'CTC', 'LWD', 'DOJ', 'PF', 'ESI', 'TDS', 'Appraisal'
    ]);
    res.loadDomainDictionary('lims', [
      'LIMS', 'CAPA', 'COA', 'QC', 'QA', 'HPLC', 'ELISA', 'PCR', 'LOD', 'LOQ', 'Assay'
    ]);
    res.loadDomainDictionary('finance', [
      'GSTIN', 'EBITDA', 'HSN', 'SAC', 'TDS', 'P&L', 'Ledger', 'Invoice', 'BalanceSheet', 'TrialBalance'
    ]);
    res.loadDomainDictionary('hospitality', [
      'ADR', 'RevPAR', 'GOPPAR', 'Occupancy', 'Folio', 'PMS', 'GDS', 'OTA', 'StaySphere', 'NightAudit'
    ]);
    res.loadDomainDictionary('realestate', [
      'RERA', 'SquareFootage', 'SuperBuiltUp', 'CarpetArea', 'TitleDeed', 'Escrow', 'HOA', 'CapRate'
    ]);
    res.loadDomainDictionary('trading', [
      'Bid', 'Ask', 'Spread', 'Slippage', 'OrderBook', 'VWAP', 'StopLoss', 'TakeProfit', 'Demat', 'Arbitrage'
    ]);
    res.loadDomainDictionary('pharma', [
      'API', 'Excipient', 'CDMO', 'CRO', 'cGMP', 'USFDA', 'Dissolution', 'Pharmacovigilance', 'ColdChain'
    ]);
    res.loadDomainDictionary('ecommerce', [
      'SKU', 'Catalog', 'CartAbandonment', 'AOV', 'CLTV', 'PaymentGateway', 'COD', 'GMV', 'Cartlinx'
    ]);
    res.loadDomainDictionary('supplychain', [
      'Procurement', 'PurchaseOrder', '3PL', '4PL', 'WMS', 'TMS', 'CrossDocking', 'BillOfLading', 'LeadTime'
    ]);
    return res;
  }, []);

  const spellEngine = useMemo(() => {
    const terms = resolver.resolveEffectiveTerms({ domain, tenantId, userId });
    return new SpellChecker(terms);
  }, [resolver, domain, tenantId, userId]);

  const languageClient = useMemo(() => {
    return new LanguageServiceClient({
      onDegradedStateChange: (degraded: boolean) => {
        setIsDegraded(degraded);
        if (onErrorStateChange) onErrorStateChange(degraded);
      },
    });
  }, [onErrorStateChange]);

  // 2. Tier 1: Local spell checking (<300ms)
  const spellMatches = useMemo<CheckMatch[]>(() => {
    if (!spellCheck || !value) return [];
    return spellEngine.checkText(value);
  }, [spellCheck, value, spellEngine]);

  // 3. Tier 2: Debounced grammar checking (800ms)
  const debouncedText = useDebounce(value, debounceGrammarMs);
  const [grammarMatches, setGrammarMatches] = useState<CheckMatch[]>([]);

  useEffect(() => {
    if (!grammarCheck || !debouncedText || debouncedText.trim().length < 3) {
      setGrammarMatches([]);
      return;
    }

    let isMounted = true;
    setIsCheckingGrammar(true);

    languageClient
      .checkLanguage({
        text: debouncedText,
        domain,
        tenantId,
        options: { includeSpelling: false },
      })
      .then((matches: CheckMatch[]) => {
        if (isMounted) {
          // Filter out false positives from effective dictionary
          const effectiveTerms = new Set(
            resolver.resolveEffectiveTerms({ domain, tenantId, userId }).map((t: string) => t.toLowerCase())
          );
          const filtered = matches.filter(
            (m: CheckMatch) => !effectiveTerms.has(m.word.toLowerCase())
          );
          setGrammarMatches(filtered);
          setIsCheckingGrammar(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsCheckingGrammar(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedText, grammarCheck, domain, tenantId, userId, languageClient, resolver]);

  // Combined active matches (Spell takes precedence on same offset)
  const allMatches = useMemo(() => {
    const combined: CheckMatch[] = [...spellMatches];
    for (const gm of grammarMatches) {
      const overlaps = spellMatches.some(
        (sm) => gm.offset < sm.offset + sm.length && gm.offset + gm.length > sm.offset
      );
      if (!overlaps) {
        combined.push(gm);
      }
    }
    return combined;
  }, [spellMatches, grammarMatches]);

  const handleApplySuggestion = (replacement: string) => {
    if (!activeMatch) return;
    const before = value.substring(0, activeMatch.offset);
    const after = value.substring(activeMatch.offset + activeMatch.length);
    const newValue = `${before}${replacement}${after}`;

    onChange(newValue);
    if (onSuggestionAccepted) {
      onSuggestionAccepted(activeMatch.word, replacement);
    }
    setActiveMatch(null);
  };

  const handleIgnore = () => {
    if (activeMatch) {
      spellEngine.ignoreWord(activeMatch.word);
      setActiveMatch(null);
    }
  };

  const handleAddToDictionary = () => {
    if (activeMatch) {
      spellEngine.addWord(activeMatch.word);
      setActiveMatch(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`cblx-smart-editor-container ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        rows={minRows}
        className="cblx-smart-editor-textarea"
        aria-label={ariaLabel}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: '0.95rem',
          lineHeight: 1.5,
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          outline: 'none',
          boxSizing: 'border-box',
          resize: 'vertical',
        }}
      />

      {/* Popover overlay for suggestions */}
      {activeMatch && (
        <SuggestionPopover
          match={activeMatch}
          position={popoverPos}
          onApplySuggestion={handleApplySuggestion}
          onIgnore={handleIgnore}
          onAddToDictionary={handleAddToDictionary}
          onClose={() => setActiveMatch(null)}
        />
      )}

      {/* Footer bar with domain badge, error count, and fail-open state */}
      <div
        className="cblx-smart-editor-footer"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '4px',
          fontSize: '0.75rem',
          color: '#64748b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#f1f5f9',
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          >
            {domain} Intelligence
          </span>
          {isCheckingGrammar && <span style={{ fontStyle: 'italic' }}>Checking grammar...</span>}
          {isDegraded && (
            <span style={{ color: '#d97706' }} title="Running in offline spell-check mode">
              ⚠️ Offline Mode
            </span>
          )}
        </div>

        <div>
          {allMatches.length > 0 ? (
            <button
              type="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setPopoverPos({ top: 30, left: Math.max(0, rect.left - 20) });
                setActiveMatch(allMatches[0]);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: allMatches.some((m) => m.type === 'spelling') ? '#ef4444' : '#d97706',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              {allMatches.length} suggestion{allMatches.length > 1 ? 's' : ''} available
            </button>
          ) : (
            <span style={{ color: '#10b981' }}>✓ All clear</span>
          )}
        </div>
      </div>
    </div>
  );
};
