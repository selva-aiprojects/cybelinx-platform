import { SpellChecker } from '../src/spell/spell-checker';

describe('SpellChecker (Tier 1)', () => {
  let checker: SpellChecker;

  beforeEach(() => {
    checker = new SpellChecker([
      'patient',
      'fever',
      'chills',
      'headache',
      'hypertension',
      'diabetes',
      'metformin',
      'hba1c',
      'doctor',
      'has',
      'and',
      'severe',
    ]);
  });

  it('correctly accepts words present in dictionary', () => {
    expect(checker.checkWord('patient')).toBe(true);
    expect(checker.checkWord('Patient')).toBe(true);
    expect(checker.checkWord('HbA1c')).toBe(true);
    expect(checker.checkWord('Metformin')).toBe(true);
  });

  it('flags misspelled words and provides suggestions', () => {
    expect(checker.checkWord('fevr')).toBe(false);
    const suggestions = checker.getSuggestions('fevr');
    expect(suggestions).toContain('fever');
  });

  it('correctly identifies spelling errors in full sentence text', () => {
    const text = 'Patient has fevr and severe hedache.';
    const matches = checker.checkText(text);

    expect(matches.length).toBe(2);
    expect(matches[0].word).toBe('fevr');
    expect(matches[0].suggestions).toContain('fever');
    expect(matches[1].word).toBe('hedache');
    expect(matches[1].suggestions).toContain('headache');
  });

  it('respects ignored words', () => {
    checker.ignoreWord('specialcode');
    expect(checker.checkWord('specialcode')).toBe(true);
  });
});
