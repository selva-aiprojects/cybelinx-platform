export type LanguageDomain =
  | 'healthcare'
  | 'hrms'
  | 'lims'
  | 'finance'
  | 'hospitality'
  | 'realestate'
  | 'trading'
  | 'pharma'
  | 'ecommerce'
  | 'supplychain'
  | 'common';

export type CheckMatchType = 'spelling' | 'grammar' | 'punctuation' | 'style';

export interface CheckMatch {
  offset: number;
  length: number;
  word: string;
  type: CheckMatchType;
  ruleId?: string;
  message: string;
  suggestions: string[];
}

export interface LanguageConfig {
  domain: LanguageDomain;
  tenantId?: string;
  userId?: string;
  spellCheck: boolean;
  grammarCheck: boolean;
  debounceGrammarMs: number;
  language: string;
}

export interface DictionaryData {
  domain: LanguageDomain;
  version: string;
  language: string;
  terms: string[];
  checksum?: string;
}

export interface LanguageCheckRequest {
  text: string;
  domain: LanguageDomain;
  language?: string;
  tenantId?: string;
  options?: {
    includeSpelling?: boolean;
    strictPunctuation?: boolean;
  };
}

export interface LanguageCheckResponse {
  matches: CheckMatch[];
  engineVersion: string;
  processingTimeMs: number;
}
