import { PatternEntry, PatternSuggestion, PatternTemplate, PatternFrontmatter } from '../src/types';

describe('types', () => {
  it('PatternFrontmatter accepts required fields', () => {
    const fm: PatternFrontmatter = {
      name: 'Strategy',
      category: 'behavioral',
      languages: ['go', 'java'],
      triggers: ['interchangeable algorithms']
    };
    expect(fm.name).toBe('Strategy');
  });

  it('PatternEntry has all content sections', () => {
    const entry: PatternEntry = {
      frontmatter: { name: 'Strategy', category: 'behavioral', languages: ['go'], triggers: [] },
      overview: 'An overview',
      components: 'Components text',
      constraints: 'Constraints text',
      antiPatterns: 'Anti-patterns text',
      genericExampleStructure: 'Generic example',
      languageSections: new Map()
    };
    expect(entry.overview).toBe('An overview');
    expect(entry.antiPatterns).toBe('Anti-patterns text');
  });

  it('PatternSuggestion has confidence field', () => {
    const s: PatternSuggestion = {
      name: 'Strategy', category: 'behavioral',
      rationale: 'reason', confidence: 0.9
    };
    expect(s.confidence).toBe(0.9);
  });

  it('PatternTemplate has all response fields', () => {
    const t: PatternTemplate = {
      pattern: 'Strategy', language: 'go',
      components: 'c', constraints: 'c',
      antiPatterns: 'a', languageNotes: 'n',
      exampleStructure: 'e'
    };
    expect(t.language).toBe('go');
  });
});
