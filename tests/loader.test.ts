import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadTemplates } from '../src/loader';

const FIXTURE = `---
name: TestPattern
category: behavioral
aliases: [TestAlias]
languages: [go, python, typescript, generic]
triggers:
  - test trigger phrase
  - another trigger
---

## Overview
A test pattern for unit testing.

## Components
- **Component1**: Does something

## Constraints
- Constraint one

## Anti-Patterns
- Anti-pattern one

## Generic Example Structure
\`\`\`
GenericCode {}
\`\`\`

## Go
### Notes
- Go-specific note

### Example Structure
\`\`\`go
type TestPattern struct{}
\`\`\`

## Python
### Notes
- Python-specific note

### Example Structure
\`\`\`python
class TestPattern:
    pass
\`\`\`

## TypeScript
### Notes
- TypeScript test note

### Example Structure
\`\`\`typescript
const ts = 'TypeScript test';
\`\`\`
`;

describe('loadTemplates', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-test-'));
    fs.mkdirSync(path.join(tmpDir, 'behavioral'));
    fs.writeFileSync(path.join(tmpDir, 'behavioral', 'test-pattern.md'), FIXTURE);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('loads a pattern entry from a template file', () => {
    const { patternIndex } = loadTemplates(tmpDir);
    expect(patternIndex.has('testpattern')).toBe(true);
  });

  it('indexes aliases as lowercase with no spaces', () => {
    const { patternIndex } = loadTemplates(tmpDir);
    expect(patternIndex.has('testalias')).toBe(true);
  });

  it('alias and name map to the same PatternEntry object', () => {
    const { patternIndex } = loadTemplates(tmpDir);
    expect(patternIndex.get('testpattern')).toBe(patternIndex.get('testalias'));
  });

  it('builds keyword index from triggers', () => {
    const { keywordIndex } = loadTemplates(tmpDir);
    expect(keywordIndex.get('test trigger phrase')).toContain('TestPattern');
    expect(keywordIndex.get('another trigger')).toContain('TestPattern');
  });

  it('parses Go language section notes', () => {
    const { patternIndex } = loadTemplates(tmpDir);
    const entry = patternIndex.get('testpattern')!;
    expect(entry.languageSections.get('go')!.notes).toContain('Go-specific note');
  });

  it('parses TypeScript language section notes', () => {
    const { patternIndex } = loadTemplates(tmpDir);
    const entry = patternIndex.get('testpattern')!;
    expect(entry.languageSections.get('typescript')!.notes).toContain('TypeScript test note');
  });

  it('parses components, constraints, and antiPatterns', () => {
    const { patternIndex } = loadTemplates(tmpDir);
    const entry = patternIndex.get('testpattern')!;
    expect(entry.components).toContain('Component1');
    expect(entry.constraints).toContain('Constraint one');
    expect(entry.antiPatterns).toContain('Anti-pattern one');
  });
});
