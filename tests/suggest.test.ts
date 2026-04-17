import { suggestPattern } from '../src/tools/suggest';
import { PatternEntry, PatternCategory } from '../src/types';

function makeEntry(name: string, category: PatternCategory, triggers: string[]): PatternEntry {
  return {
    frontmatter: { name, category, languages: ['go'], triggers },
    overview: '', components: '', constraints: '', antiPatterns: '',
    genericExampleStructure: '',
    languageSections: new Map(),
  };
}

describe('suggestPattern', () => {
  let patternIndex: Map<string, PatternEntry>;

  beforeEach(() => {
    patternIndex = new Map([
      ['strategy', makeEntry('Strategy', 'behavioral', [
        'multiple interchangeable algorithms',
        'algorithm selection at runtime',
        'pluggable behavior',
      ])],
      ['observer', makeEntry('Observer', 'behavioral', [
        'notify subscribers on state change',
        'event-driven notification',
      ])],
      ['factorymethod', makeEntry('Factory Method', 'creational', [
        'create objects without specifying class',
        'object creation logic',
      ])],
    ]);
  });

  it('returns Strategy as top match for interchangeable algorithms', () => {
    const results = suggestPattern('multiple interchangeable algorithms at runtime', undefined, patternIndex);
    expect(results[0].name).toBe('Strategy');
    expect(results[0].confidence).toBeGreaterThan(0.3);
  });

  it('returns at most 3 results', () => {
    const results = suggestPattern('algorithm behavior', undefined, patternIndex);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('filters by category when provided', () => {
    const results = suggestPattern('create objects', 'creational', patternIndex);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r.category).toBe('creational');
    });
  });

  it('returns __no_match__ sentinel with category summary when nothing scores above 0.3', () => {
    const results = suggestPattern('xyzzy quux blorg unrelated', undefined, patternIndex);
    expect(results[0].name).toBe('__no_match__');
    expect(results[0].confidence).toBe(0);
    expect(results[0].rationale).toContain('behavioral');
  });

  it('returns all patterns in category when no match and category is provided', () => {
    const results = suggestPattern('xyzzy quux blorg', 'creational', patternIndex);
    expect(results.every(r => r.category === 'creational')).toBe(true);
    expect(results.every(r => r.confidence === 0)).toBe(true);
  });

  it('includes rationale drawn from first trigger phrase', () => {
    const results = suggestPattern('multiple interchangeable algorithms', undefined, patternIndex);
    expect(results[0].rationale).toBeTruthy();
  });

  it('does not duplicate entries when alias and canonical name share the same frontmatter.name', () => {
    const index = new Map([
      ['strategy', makeEntry('Strategy', 'behavioral', ['interchangeable algorithms'])],
      ['policy',   makeEntry('Strategy', 'behavioral', ['interchangeable algorithms'])], // alias
    ]);
    const results = suggestPattern('interchangeable algorithms', undefined, index);
    expect(results.filter(r => r.name === 'Strategy').length).toBe(1);
  });
});
