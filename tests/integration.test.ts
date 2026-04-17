import * as path from 'path';
import { loadTemplates } from '../src/loader';
import { getTemplate } from '../src/tools/get-template';
import { suggestPattern } from '../src/tools/suggest';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

describe('integration: real templates directory', () => {
  let patternIndex: ReturnType<typeof loadTemplates>['patternIndex'];

  beforeAll(() => {
    ({ patternIndex } = loadTemplates(TEMPLATES_DIR));
  });

  it('loads at least one pattern', () => {
    expect(patternIndex.size).toBeGreaterThan(0);
  });

  it('suggest_pattern returns Strategy for interchangeable algorithms', () => {
    const results = suggestPattern(
      'multiple interchangeable algorithms at runtime',
      undefined, patternIndex
    );
    expect(results.map(r => r.name)).toContain('Strategy');
  });

  it('get_template returns Strategy+Go with all required sections', () => {
    const { template } = getTemplate('Strategy', 'go', patternIndex);
    expect(template).toBeDefined();
    expect(template!.components).not.toBe('');
    expect(template!.constraints).not.toBe('');
    expect(template!.antiPatterns).not.toBe('');
  });

  it('Strategy+Go response is under 2400 characters (~600 tokens)', () => {
    const { template, warning } = getTemplate('Strategy', 'go', patternIndex);
    // Mirrors formatTemplate in src/index.ts: parts joined with '\n', blank strings create blank lines
    const parts = [
      `Pattern: ${template!.pattern}`,
      `Language: ${template!.language}`,
      '',
      `COMPONENTS:\n${template!.components}`,
      '',
      `CONSTRAINTS:\n${template!.constraints}`,
      '',
      `ANTI-PATTERNS:\n${template!.antiPatterns}`,
    ];
    if (template!.languageNotes) parts.push('', `${template!.language.toUpperCase()}-SPECIFIC NOTES:\n${template!.languageNotes}`);
    if (template!.exampleStructure) parts.push('', `EXAMPLE STRUCTURE:\n${template!.exampleStructure}`);
    if (warning) parts.push('', `NOTE: ${warning}`);
    expect(parts.join('\n').length).toBeLessThan(2400);
  });
});
