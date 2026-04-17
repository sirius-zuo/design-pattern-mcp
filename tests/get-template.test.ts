import { getTemplate } from '../src/tools/get-template';
import { PatternEntry } from '../src/types';

function makeEntry(name: string, overrides: Partial<PatternEntry> = {}): PatternEntry {
  return {
    frontmatter: { name, category: 'behavioral', languages: ['go', 'java'], triggers: [] },
    overview: `${name} overview`,
    components: `${name} components`,
    constraints: `${name} constraints`,
    antiPatterns: `${name} anti-patterns`,
    genericExampleStructure: 'Generic {}',
    languageSections: new Map([
      ['go',   { notes: 'Go notes',   exampleStructure: 'type S interface{}' }],
      ['java', { notes: 'Java notes', exampleStructure: 'interface S {}' }],
    ]),
    ...overrides,
  };
}

describe('getTemplate', () => {
  let patternIndex: Map<string, PatternEntry>;

  beforeEach(() => {
    patternIndex = new Map([
      ['strategy', makeEntry('Strategy')],
      ['policy',   makeEntry('Strategy')],  // alias
      ['observer', makeEntry('Observer')],
    ]);
  });

  it('returns template for known pattern and language', () => {
    const { template } = getTemplate('Strategy', 'go', patternIndex);
    expect(template).toBeDefined();
    expect(template!.pattern).toBe('Strategy');
    expect(template!.language).toBe('go');
    expect(template!.languageNotes).toBe('Go notes');
    expect(template!.exampleStructure).toBe('type S interface{}');
  });

  it('includes components, constraints, and antiPatterns in all responses', () => {
    const { template } = getTemplate('Strategy', 'go', patternIndex);
    expect(template!.components).toBe('Strategy components');
    expect(template!.constraints).toBe('Strategy constraints');
    expect(template!.antiPatterns).toBe('Strategy anti-patterns');
  });

  it('resolves aliases to the canonical pattern', () => {
    const { template } = getTemplate('Policy', 'go', patternIndex);
    expect(template!.pattern).toBe('Strategy');
  });

  it('falls back to generic when language not in template', () => {
    const { template, warning } = getTemplate('Strategy', 'kotlin', patternIndex);
    expect(template).toBeDefined();
    expect(template!.exampleStructure).toBe('Generic {}');
    expect(warning).toContain('kotlin');
  });

  it('returns generic template when language param is "generic"', () => {
    const { template } = getTemplate('Strategy', 'generic', patternIndex);
    expect(template!.language).toBe('Generic');
    expect(template!.exampleStructure).toBe('Generic {}');
    expect(template!.languageNotes).toBe('');
  });

  it('returns error with closest match suggestion for unknown pattern', () => {
    const { error } = getTemplate('Stratgey', 'go', patternIndex);
    expect(error).toBeDefined();
    expect(error).toContain('Strategy');
  });
});
