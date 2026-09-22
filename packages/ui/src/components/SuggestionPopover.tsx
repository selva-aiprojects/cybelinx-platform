import React, { useRef, useEffect } from 'react';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { CheckMatch } from '@cybelinx/language';

export interface SuggestionPopoverProps {
  match: CheckMatch;
  position: { top: number; left: number };
  onApplySuggestion: (replacement: string) => void;
  onIgnore: () => void;
  onAddToDictionary?: () => void;
  onClose: () => void;
}

export const SuggestionPopover: React.FC<SuggestionPopoverProps> = ({
  match,
  position,
  onApplySuggestion,
  onIgnore,
  onAddToDictionary,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(popoverRef, onClose);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isSpelling = match.type === 'spelling';
  const headerColor = isSpelling ? 'var(--cblx-spell-color, #ef4444)' : 'var(--cblx-grammar-color, #d97706)';

  return (
    <div
      ref={popoverRef}
      className="cblx-suggestion-popover"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 100,
        backgroundColor: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '12px',
        width: '240px',
      }}
      role="dialog"
      aria-label="Language suggestions"
    >
      <div style={{ marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: headerColor, textTransform: 'uppercase' }}>
          {isSpelling ? 'Spelling Issue' : 'Grammar Suggestion'}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
          "{match.word}"
        </div>
        {match.message && (
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            {match.message}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
          Suggestions:
        </div>
        {match.suggestions && match.suggestions.length > 0 ? (
          match.suggestions.map((sugg: string, idx: number) => (
            <button
              key={idx}
              type="button"
              className="cblx-suggestion-item"
              onClick={() => onApplySuggestion(sugg)}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '6px 8px',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                borderRadius: '4px',
                fontSize: '0.875rem',
                color: '#0284c7',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span style={{ marginRight: '6px' }}>✓</span> {sugg}
            </button>
          ))
        ) : (
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
            No automatic suggestions
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <button
          type="button"
          className="cblx-action-btn"
          onClick={onIgnore}
        >
          Ignore once
        </button>
        {onAddToDictionary && (
          <button
            type="button"
            className="cblx-action-btn"
            onClick={onAddToDictionary}
          >
            + Add "{match.word}" to dictionary
          </button>
        )}
      </div>
    </div>
  );
};
