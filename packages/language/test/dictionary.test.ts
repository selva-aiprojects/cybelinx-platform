import { DictionaryResolver } from '../src/dictionary/resolver';

describe('DictionaryResolver (4-Tier Hierarchy)', () => {
  let resolver: DictionaryResolver;

  beforeEach(() => {
    resolver = new DictionaryResolver();
    resolver.loadCommonDictionary(['patient', 'report', 'doctor']);
    resolver.loadDomainDictionary('healthcare', ['MRN', 'UHID', 'HbA1c', 'Metformin']);
    resolver.loadDomainDictionary('hrms', ['CTC', 'KRA', 'DOJ', 'PF']);
    resolver.addTenantTerms('hospital-alpha', ['AlphaWard10', 'ProtocolX']);
    resolver.addUserTerms('user-dr-priya', ['PriyaPreferredTerm']);
  });

  it('resolves common + domain terms accurately', () => {
    const healthcareTerms = resolver.resolveEffectiveTerms({ domain: 'healthcare' });
    expect(healthcareTerms).toContain('patient');
    expect(healthcareTerms).toContain('HbA1c');
    expect(healthcareTerms).not.toContain('CTC'); // HRMS term should not leak
  });

  it('isolates tenant terms strictly', () => {
    const alphaTerms = resolver.resolveEffectiveTerms({
      domain: 'healthcare',
      tenantId: 'hospital-alpha',
    });
    expect(alphaTerms).toContain('AlphaWard10');

    const betaTerms = resolver.resolveEffectiveTerms({
      domain: 'healthcare',
      tenantId: 'hospital-beta',
    });
    expect(betaTerms).not.toContain('AlphaWard10'); // Tenant isolation verified
  });

  it('includes user custom terms for authenticated user only', () => {
    const drPriyaTerms = resolver.resolveEffectiveTerms({
      domain: 'healthcare',
      tenantId: 'hospital-alpha',
      userId: 'user-dr-priya',
    });
    expect(drPriyaTerms).toContain('PriyaPreferredTerm');

    const otherDoctorTerms = resolver.resolveEffectiveTerms({
      domain: 'healthcare',
      tenantId: 'hospital-alpha',
      userId: 'user-dr-rajesh',
    });
    expect(otherDoctorTerms).not.toContain('PriyaPreferredTerm');
  });

  it('computes consistent dictionary checksums', () => {
    const terms = ['Alpha', 'Beta', 'Gamma'];
    const checksum1 = resolver.computeChecksum(terms);
    const checksum2 = resolver.computeChecksum(['Gamma', 'Beta', 'Alpha']); // Order invariant
    expect(checksum1).toBe(checksum2);
  });
});
