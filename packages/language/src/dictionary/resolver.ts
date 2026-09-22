import { LanguageDomain } from '../types';

export class DictionaryResolver {
  private commonTerms: Set<string> = new Set();
  private domainTerms: Map<LanguageDomain, Set<string>> = new Map();
  private tenantTerms: Map<string, Set<string>> = new Map(); // tenantId -> terms
  private userTerms: Map<string, Set<string>> = new Map(); // userId -> terms

  constructor() {
    this.initDefaultDomains();
  }

  private initDefaultDomains() {
    const domains: LanguageDomain[] = [
      'healthcare',
      'hrms',
      'lims',
      'finance',
      'hospitality',
      'realestate',
      'trading',
      'pharma',
      'ecommerce',
      'supplychain',
      'common',
    ];
    for (const d of domains) {
      this.domainTerms.set(d, new Set());
    }
  }

  public loadCommonDictionary(terms: string[]): void {
    for (const term of terms) {
      this.commonTerms.add(term.trim());
    }
  }

  public loadDomainDictionary(domain: LanguageDomain, terms: string[]): void {
    if (!this.domainTerms.has(domain)) {
      this.domainTerms.set(domain, new Set());
    }
    const set = this.domainTerms.get(domain)!;
    for (const term of terms) {
      set.add(term.trim());
    }
  }

  public addTenantTerms(tenantId: string, terms: string[]): void {
    if (!this.tenantTerms.has(tenantId)) {
      this.tenantTerms.set(tenantId, new Set());
    }
    const set = this.tenantTerms.get(tenantId)!;
    for (const term of terms) {
      set.add(term.trim());
    }
  }

  public addUserTerms(userId: string, terms: string[]): void {
    if (!this.userTerms.has(userId)) {
      this.userTerms.set(userId, new Set());
    }
    const set = this.userTerms.get(userId)!;
    for (const term of terms) {
      set.add(term.trim());
    }
  }

  /**
   * Resolves the effective dictionary for a given domain, tenant, and user
   * Order of precedence: User -> Tenant -> Domain -> Common
   */
  public resolveEffectiveTerms(options: {
    domain?: LanguageDomain;
    tenantId?: string;
    userId?: string;
  }): string[] {
    const effective = new Set<string>();

    // 1. Common terms
    for (const term of this.commonTerms) {
      effective.add(term);
    }

    // 2. Domain terms
    if (options.domain && this.domainTerms.has(options.domain)) {
      const domSet = this.domainTerms.get(options.domain)!;
      for (const term of domSet) {
        effective.add(term);
      }
    }

    // 3. Tenant terms
    if (options.tenantId && this.tenantTerms.has(options.tenantId)) {
      const tenSet = this.tenantTerms.get(options.tenantId)!;
      for (const term of tenSet) {
        effective.add(term);
      }
    }

    // 4. User terms
    if (options.userId && this.userTerms.has(options.userId)) {
      const usrSet = this.userTerms.get(options.userId)!;
      for (const term of usrSet) {
        effective.add(term);
      }
    }

    return Array.from(effective);
  }

  public computeChecksum(terms: string[]): string {
    let hash = 0;
    const sorted = [...terms].sort().join(',');
    for (let i = 0; i < sorted.length; i++) {
      const char = sorted.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
