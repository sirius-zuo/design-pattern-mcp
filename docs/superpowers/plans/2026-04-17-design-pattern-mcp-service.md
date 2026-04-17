# Design Pattern MCP Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript MCP server that exposes two tools (`suggest_pattern` and `get_template`) for AI coding agents to look up design pattern structural constraints and anti-patterns in a specific programming language.

**Architecture:** A stdio MCP server that parses structured markdown template files at startup into an in-memory index. `suggest_pattern` does keyword scoring against pattern trigger phrases. `get_template` does O(1) index lookup and returns only the requested language's constraints as compact plain text (~300–500 tokens per response).

**Tech Stack:** TypeScript 5, Node.js, `@modelcontextprotocol/sdk`, `gray-matter` (frontmatter parsing), `glob` (file discovery), Jest + ts-jest (testing).

---

## File Map

```
design-pattern-mcp/
  src/
    index.ts              # MCP server entry: registers tools, starts stdio listener, formats responses
    loader.ts             # Parses templates/**/*.md at startup into in-memory patternIndex + keywordIndex
    tools/
      suggest.ts          # suggest_pattern: keyword scoring, low-confidence fallback
      get-template.ts     # get_template: O(1) lookup, Levenshtein error recovery, language fallback
    types.ts              # Shared TypeScript types (PatternEntry, PatternTemplate, etc.)
  templates/
    creational/           # 5 pattern files
    structural/           # 7 pattern files
    behavioral/           # 11 pattern files (including strategy.md as reference)
    modern/               # 8 pattern files
    architectural/        # 7 pattern files
  tests/
    types.test.ts
    loader.test.ts
    get-template.test.ts
    suggest.test.ts
    integration.test.ts
  package.json
  tsconfig.json
  .gitignore
  README.md
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
git init
git config core.sshCommand "ssh -i ~/.ssh/id_personal_git"
git remote add origin git@github.com:olivezuo/design-pattern-mcp.git
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "design-pattern-mcp",
  "version": "1.0.0",
  "description": "MCP server providing design pattern templates for AI coding agents",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "glob": "^10.4.0",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.4.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/tests"]
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
*.js.map
.env
```

- [ ] **Step 5: Create directories and install dependencies**

```bash
mkdir -p src/tools tests templates/{creational,structural,behavioral,modern,architectural}
npm install
```

Expected: `node_modules/` directory created, no errors.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
echo 'export {}' > src/index.ts && npm run build
```

Expected: `dist/index.js` created with no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json .gitignore src/
git commit -m "chore: project scaffolding for design-pattern-mcp server"
```

---

### Task 2: Type definitions

**Files:**
- Create: `src/types.ts`
- Create: `tests/types.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/types.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/types.test.ts
```

Expected: FAIL — `Cannot find module '../src/types'`

- [ ] **Step 3: Create src/types.ts**

```typescript
export type PatternCategory = 'creational' | 'structural' | 'behavioral' | 'modern' | 'architectural';

export interface PatternFrontmatter {
  name: string;
  category: PatternCategory;
  aliases?: string[];
  languages: string[];
  triggers: string[];
}

export interface LanguageSection {
  notes: string;
  exampleStructure: string;
}

export interface PatternEntry {
  frontmatter: PatternFrontmatter;
  overview: string;
  components: string;
  constraints: string;
  antiPatterns: string;
  genericExampleStructure: string;
  languageSections: Map<string, LanguageSection>;
}

export interface PatternSuggestion {
  name: string;
  category: string;
  rationale: string;
  confidence: number;
}

export interface PatternTemplate {
  pattern: string;
  language: string;
  components: string;
  constraints: string;
  antiPatterns: string;
  languageNotes: string;
  exampleStructure: string;
}

export interface LoadResult {
  patternIndex: Map<string, PatternEntry>;
  keywordIndex: Map<string, string[]>;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/types.test.ts
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts tests/types.test.ts
git commit -m "feat: add type definitions for pattern entries and MCP tool responses"
```

---

### Task 3: Template loader

**Files:**
- Create: `src/loader.ts`
- Create: `tests/loader.test.ts`

The tests use an in-memory fixture directory to avoid a dependency on real template files.

- [ ] **Step 1: Write failing test**

Create `tests/loader.test.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadTemplates } from '../src/loader';

const FIXTURE = `---
name: TestPattern
category: behavioral
aliases: [TestAlias]
languages: [go, python, generic]
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
    expect(keywordIndex.size).toBeGreaterThan(0);
  });

  it('parses Go language section notes', () => {
    const { patternIndex } = loadTemplates(tmpDir);
    const entry = patternIndex.get('testpattern')!;
    expect(entry.languageSections.get('go')!.notes).toContain('Go-specific note');
  });

  it('parses components, constraints, and antiPatterns', () => {
    const { patternIndex } = loadTemplates(tmpDir);
    const entry = patternIndex.get('testpattern')!;
    expect(entry.components).toContain('Component1');
    expect(entry.constraints).toContain('Constraint one');
    expect(entry.antiPatterns).toContain('Anti-pattern one');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/loader.test.ts
```

Expected: FAIL — `Cannot find module '../src/loader'`

- [ ] **Step 3: Create src/loader.ts**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { PatternEntry, PatternFrontmatter, LanguageSection, LoadResult } from './types';

const LANG_HEADING: Record<string, string> = {
  go: 'Go',
  java: 'Java',
  python: 'Python',
  rust: 'Rust',
};

function extractSection(content: string, sectionName: string): string {
  const regex = new RegExp(`^## ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function extractLanguageSection(content: string, heading: string): LanguageSection {
  const langRegex = new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## [A-Z]|$)`, 'm');
  const langMatch = content.match(langRegex);
  if (!langMatch) return { notes: '', exampleStructure: '' };

  const langContent = langMatch[1];
  const notesMatch = langContent.match(/^### Notes\s*\n([\s\S]*?)(?=\n### |$)/m);
  const exampleMatch = langContent.match(/^### Example Structure\s*\n([\s\S]*?)(?=\n### |$)/m);

  return {
    notes: notesMatch ? notesMatch[1].trim() : '',
    exampleStructure: exampleMatch ? exampleMatch[1].trim() : '',
  };
}

export function loadTemplates(templatesDir: string): LoadResult {
  const patternIndex = new Map<string, PatternEntry>();
  const keywordIndex = new Map<string, string[]>();

  const files = glob.sync('**/*.md', { cwd: templatesDir });

  for (const file of files) {
    const raw = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
    const { data, content } = matter(raw);
    const fm = data as PatternFrontmatter;

    const languageSections = new Map<string, LanguageSection>();
    for (const lang of fm.languages) {
      const heading = LANG_HEADING[lang];
      if (heading) {
        languageSections.set(lang, extractLanguageSection(content, heading));
      }
    }

    const entry: PatternEntry = {
      frontmatter: fm,
      overview: extractSection(content, 'Overview'),
      components: extractSection(content, 'Components'),
      constraints: extractSection(content, 'Constraints'),
      antiPatterns: extractSection(content, 'Anti-Patterns'),
      genericExampleStructure: extractSection(content, 'Generic Example Structure'),
      languageSections,
    };

    // Index by lowercase name + all aliases (spaces removed for multi-word names)
    const keys = [fm.name, ...(fm.aliases ?? [])].map(k =>
      k.toLowerCase().replace(/[\s\/\-]+/g, '')
    );
    for (const key of keys) {
      patternIndex.set(key, entry);
    }

    // Build keyword index from triggers
    for (const trigger of fm.triggers) {
      const existing = keywordIndex.get(trigger) ?? [];
      existing.push(fm.name);
      keywordIndex.set(trigger, existing);
    }
  }

  return { patternIndex, keywordIndex };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/loader.test.ts
```

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/loader.ts tests/loader.test.ts
git commit -m "feat: template loader parses markdown files into in-memory pattern index"
```

---

### Task 4: get_template tool

**Files:**
- Create: `src/tools/get-template.ts`
- Create: `tests/get-template.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/get-template.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/get-template.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/get-template'`

- [ ] **Step 3: Create src/tools/get-template.ts**

```typescript
import { PatternEntry, PatternTemplate } from '../types';

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function findClosest(input: string, patternIndex: Map<string, PatternEntry>): string {
  const seen = new Set<string>();
  let minDist = Infinity;
  let closest = '';
  for (const [, entry] of patternIndex) {
    const canonical = entry.frontmatter.name;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const dist = levenshtein(input.toLowerCase(), canonical.toLowerCase());
    if (dist < minDist) { minDist = dist; closest = canonical; }
  }
  return closest;
}

export function getTemplate(
  pattern: string,
  language: string,
  patternIndex: Map<string, PatternEntry>
): { template?: PatternTemplate; error?: string; warning?: string } {
  const key = pattern.toLowerCase().replace(/[\s\/\-]+/g, '');
  const entry = patternIndex.get(key);

  if (!entry) {
    const closest = findClosest(pattern, patternIndex);
    return { error: `Pattern '${pattern}' not found. Did you mean '${closest}'?` };
  }

  const lang = language.toLowerCase();
  let languageNotes = '';
  let exampleStructure = entry.genericExampleStructure;
  let warning: string | undefined;

  if (lang !== 'generic') {
    const section = entry.languageSections.get(lang);
    if (section && (section.notes || section.exampleStructure)) {
      languageNotes = section.notes;
      if (section.exampleStructure) exampleStructure = section.exampleStructure;
    } else {
      warning = `No ${language}-specific notes available; returning generic template.`;
    }
  }

  return {
    template: {
      pattern: entry.frontmatter.name,
      language: lang === 'generic' ? 'Generic' : language,
      components: entry.components,
      constraints: entry.constraints,
      antiPatterns: entry.antiPatterns,
      languageNotes,
      exampleStructure,
    },
    warning,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/get-template.test.ts
```

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/tools/get-template.ts tests/get-template.test.ts
git commit -m "feat: get_template tool with language fallback and Levenshtein error recovery"
```

---

### Task 5: suggest_pattern tool

**Files:**
- Create: `src/tools/suggest.ts`
- Create: `tests/suggest.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/suggest.test.ts`:
```typescript
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
    results.filter(r => r.name !== '__no_match__').forEach(r => {
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
  });

  it('includes rationale drawn from first trigger phrase', () => {
    const results = suggestPattern('multiple interchangeable algorithms', undefined, patternIndex);
    expect(results[0].rationale).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/suggest.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/suggest'`

- [ ] **Step 3: Create src/tools/suggest.ts**

```typescript
import { PatternEntry, PatternSuggestion, PatternCategory } from '../types';

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
}

function scoreEntry(descTokens: string[], triggers: string[]): number {
  let score = 0;
  for (const trigger of triggers) {
    const triggerTokens = tokenize(trigger);
    if (triggerTokens.length === 0) continue;
    const matches = triggerTokens.filter(t => descTokens.includes(t)).length;
    score += matches / triggerTokens.length;
  }
  return score;
}

export function suggestPattern(
  description: string,
  category: string | undefined,
  patternIndex: Map<string, PatternEntry>
): PatternSuggestion[] {
  const descTokens = tokenize(description);
  const scores = new Map<string, number>();

  for (const [, entry] of patternIndex) {
    const name = entry.frontmatter.name;
    if (scores.has(name)) continue; // skip alias duplicates
    if (category && entry.frontmatter.category !== (category as PatternCategory)) continue;
    scores.set(name, scoreEntry(descTokens, entry.frontmatter.triggers));
  }

  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, s]) => s > 0);

  const topScore = sorted[0]?.[1] ?? 0;

  if (topScore < 0.3) {
    if (category) {
      const fallback: PatternSuggestion[] = [];
      for (const [, entry] of patternIndex) {
        if (entry.frontmatter.category !== (category as PatternCategory)) continue;
        if (fallback.some(f => f.name === entry.frontmatter.name)) continue;
        fallback.push({
          name: entry.frontmatter.name,
          category: entry.frontmatter.category,
          rationale: entry.frontmatter.triggers[0] ?? '',
          confidence: 0,
        });
      }
      return fallback;
    }

    const counts = new Map<string, number>();
    for (const [, entry] of patternIndex) {
      const cat = entry.frontmatter.category;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    const summary = [...counts.entries()].map(([c, n]) => `${c}: ${n}`).join(', ');
    return [{
      name: '__no_match__',
      category: 'none',
      rationale: `No confident match. Patterns by category: ${summary}. Retry with a category parameter to narrow results.`,
      confidence: 0,
    }];
  }

  return sorted.slice(0, 3).map(([name, score]) => {
    // Find the entry by canonical name (it may be stored under a different key)
    const entry = [...patternIndex.values()].find(e => e.frontmatter.name === name)!;
    return {
      name: entry.frontmatter.name,
      category: entry.frontmatter.category,
      rationale: entry.frontmatter.triggers[0] ?? '',
      confidence: Math.min(score, 1.0),
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/suggest.test.ts
```

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/tools/suggest.ts tests/suggest.test.ts
git commit -m "feat: suggest_pattern tool with keyword scoring and low-confidence fallback"
```

---

### Task 6: MCP server entry point

**Files:**
- Modify: `src/index.ts`
- Create: `tests/integration.test.ts`

- [ ] **Step 1: Write integration test**

Create `tests/integration.test.ts`:
```typescript
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
    const text = [
      `Pattern: ${template!.pattern}`, `Language: ${template!.language}`,
      `COMPONENTS:\n${template!.components}`,
      `CONSTRAINTS:\n${template!.constraints}`,
      `ANTI-PATTERNS:\n${template!.antiPatterns}`,
      template!.languageNotes ? `GO-SPECIFIC NOTES:\n${template!.languageNotes}` : '',
      template!.exampleStructure ? `EXAMPLE STRUCTURE:\n${template!.exampleStructure}` : '',
      warning ? `NOTE: ${warning}` : '',
    ].filter(Boolean).join('\n\n');
    expect(text.length).toBeLessThan(2400);
  });
});
```

- [ ] **Step 2: Run integration test — expect it to fail on "loads at least one pattern"**

```bash
npx jest tests/integration.test.ts
```

Expected: FAIL — `patternIndex.size` is 0 because templates directory is empty. This test will pass after Task 7.

- [ ] **Step 3: Write src/index.ts**

```typescript
import * as path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadTemplates } from './loader';
import { getTemplate } from './tools/get-template';
import { suggestPattern } from './tools/suggest';
import { PatternTemplate } from './types';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

function formatTemplate(t: PatternTemplate, warning?: string): string {
  const parts = [
    `Pattern: ${t.pattern}`,
    `Language: ${t.language}`,
    '',
    `COMPONENTS:\n${t.components}`,
    '',
    `CONSTRAINTS:\n${t.constraints}`,
    '',
    `ANTI-PATTERNS:\n${t.antiPatterns}`,
  ];
  if (t.languageNotes) {
    parts.push('', `${t.language.toUpperCase()}-SPECIFIC NOTES:\n${t.languageNotes}`);
  }
  if (t.exampleStructure) {
    parts.push('', `EXAMPLE STRUCTURE:\n${t.exampleStructure}`);
  }
  if (warning) {
    parts.push('', `NOTE: ${warning}`);
  }
  return parts.join('\n');
}

async function main(): Promise<void> {
  const { patternIndex } = loadTemplates(TEMPLATES_DIR);

  const server = new Server(
    { name: 'design-pattern-templates', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'suggest_pattern',
        description: 'Map a problem description to design pattern name(s). Returns up to 3 ranked suggestions with confidence scores. Call this when you know the problem but not which pattern to apply.',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Describe the problem (e.g. "multiple interchangeable algorithms selected at runtime")',
            },
            category: {
              type: 'string',
              enum: ['creational', 'structural', 'behavioral', 'modern', 'architectural'],
              description: 'Optional: narrow search to one pattern category',
            },
          },
          required: ['description'],
        },
      },
      {
        name: 'get_template',
        description: 'Get structural constraints and anti-patterns for a specific design pattern in a specific language. Returns compact plain text (~300-500 tokens) optimized for LLM consumption. Call this when you know which pattern to implement.',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Pattern name (e.g. "Strategy", "Observer", "Circuit Breaker")',
            },
            language: {
              type: 'string',
              description: 'Target language: "go", "java", "python", "rust", or "generic"',
            },
          },
          required: ['pattern', 'language'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'suggest_pattern') {
      const { description, category } = args as { description: string; category?: string };
      const suggestions = suggestPattern(description, category, patternIndex);
      return { content: [{ type: 'text', text: JSON.stringify(suggestions, null, 2) }] };
    }

    if (name === 'get_template') {
      const { pattern, language } = args as { pattern: string; language: string };
      const { template, error, warning } = getTemplate(pattern, language, patternIndex);
      if (error) {
        return { content: [{ type: 'text', text: error }], isError: true };
      }
      return { content: [{ type: 'text', text: formatTemplate(template!, warning) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

- [ ] **Step 4: Build to verify TypeScript compiles**

```bash
npm run build
```

Expected: `dist/index.js` created, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts tests/integration.test.ts
git commit -m "feat: MCP server entry point wiring suggest_pattern and get_template tools"
```

---

### Task 7: Strategy template (reference implementation)

**Files:**
- Create: `templates/behavioral/strategy.md`

This is the canonical reference. All other templates in Task 8 must follow this exact format.

- [ ] **Step 1: Create templates/behavioral/strategy.md**

````markdown
---
name: Strategy
category: behavioral
aliases: [Policy]
languages: [go, java, python, rust, generic]
triggers:
  - multiple interchangeable algorithms
  - algorithm selection at runtime
  - eliminate switch statement on algorithm type
  - pluggable behavior
  - swap behavior without changing the caller
  - vary algorithm independently from caller
---

## Overview
Defines a family of algorithms, encapsulates each one, and makes them interchangeable. The caller selects which algorithm to use without knowing its internals.

## Components
- **Context**: Holds a reference to a Strategy. Delegates algorithm execution to it. Contains NO algorithm logic itself.
- **Strategy** (interface/trait/abstract): Declares the common contract for all algorithm variants (typically 1-2 methods).
- **ConcreteStrategy**: Implements one algorithm variant. May hold state specific to that algorithm.

## Constraints
- Context must NOT contain algorithm logic; all logic lives in ConcreteStrategy.
- Strategy interface must be narrow (1-2 methods max).
- Context must NOT decide which ConcreteStrategy to use — that is the caller's or a factory's responsibility.
- Context switches strategies via a setter or constructor injection, not by recreating itself.

## Anti-Patterns
- Embedding the if/else or switch selection logic inside Context (defeats the purpose).
- Using a base class instead of an interface/trait for Strategy (breaks Liskov Substitution).
- Passing raw untyped data (any, interface{}, Object) to Strategy instead of a typed parameter.
- Creating a new Context every time the strategy changes — use a setter or constructor injection.

## Generic Example Structure
```
Context {
  strategy: Strategy
  setStrategy(s: Strategy): void
  execute(params: Params): Result { return strategy.run(params) }
}

interface Strategy {
  run(params: Params): Result
}

ConcreteStrategyA implements Strategy {
  run(params: Params): Result { /* algorithm A */ }
}
```

## Go

### Notes
- Interface satisfaction is implicit — no `implements` keyword.
- For single-method, stateless strategies: use a function type (`type Strategy func(Params) Result`) instead of a full interface. More idiomatic.
- Use an interface when ConcreteStrategy needs to hold state or has multiple methods.
- Inject via constructor (`NewContext(s Strategy) *Context`) for immutability.

### Example Structure
```go
type Strategy interface {
    Execute(p Params) Result
}

type Context struct{ strategy Strategy }

func NewContext(s Strategy) *Context   { return &Context{strategy: s} }
func (c *Context) Run(p Params) Result { return c.strategy.Execute(p) }

type ConcreteA struct{}
func (ConcreteA) Execute(p Params) Result { /* ... */ return Result{} }
```

## Java

### Notes
- Use `@FunctionalInterface` for single-method strategies to allow lambda expressions.
- Prefer constructor injection for immutability; avoid public setters unless runtime switching is required.
- Use generics (`Strategy<P, R>`) when parameter and return types vary across use cases.

### Example Structure
```java
@FunctionalInterface
interface Strategy<P, R> { R execute(P params); }

class Context<P, R> {
    private final Strategy<P, R> strategy;
    Context(Strategy<P, R> s) { this.strategy = s; }
    R run(P params) { return strategy.execute(params); }
}

// Lambda usage:
var ctx = new Context<Params, Result>(params -> /* algorithm A */);
```

## Python

### Notes
- Strategies are naturally represented as callables (functions or objects with `__call__`).
- Use `Protocol` for type-safe strategy interfaces; plain callables for lightweight use.
- `functools.partial` is useful for parameterizing concrete strategies.

### Example Structure
```python
from typing import Protocol

class Strategy(Protocol):
    def execute(self, params: Params) -> Result: ...

class Context:
    def __init__(self, strategy: Strategy) -> None:
        self._strategy = strategy

    def run(self, params: Params) -> Result:
        return self._strategy.execute(params)
```

## Rust

### Notes
- Use a trait for Strategy.
- Static dispatch (`Context<S: Strategy>`) — zero-cost, strategy fixed at compile time.
- Dynamic dispatch (`Box<dyn Strategy>`) — allows runtime switching, has vtable overhead.
- For single-method stateless strategies: closures (`Box<dyn Fn(Params) -> Result>`) are idiomatic.

### Example Structure
```rust
trait Strategy {
    fn execute(&self, params: &Params) -> Result;
}

// Static dispatch:
struct Context<S: Strategy> { strategy: S }
impl<S: Strategy> Context<S> {
    fn run(&self, params: &Params) -> Result { self.strategy.execute(params) }
}

// Dynamic dispatch (for runtime strategy switching):
struct DynContext { strategy: Box<dyn Strategy> }
impl DynContext {
    fn run(&self, params: &Params) -> Result { self.strategy.execute(params) }
}
```
````

- [ ] **Step 2: Run integration test — it should now pass**

```bash
npx jest tests/integration.test.ts
```

Expected: PASS — 4 tests passing including the token-budget test.

- [ ] **Step 3: Run full suite to confirm no regressions**

```bash
npx jest
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add templates/behavioral/strategy.md
git commit -m "feat: add Strategy pattern template (reference implementation)"
```

---

### Task 8: Remaining 34 pattern templates

**Files:**
- Create: 34 template files across `templates/`

Each file must follow the exact format of `templates/behavioral/strategy.md`:
- YAML frontmatter: `name`, `category`, `aliases` (if listed), `languages: [go, java, python, rust, generic]`, `triggers` (5–7 phrases)
- Sections: `## Overview`, `## Components`, `## Constraints`, `## Anti-Patterns`, `## Generic Example Structure`
- Language sections: `## Go`, `## Java`, `## Python`, `## Rust` — each with `### Notes` and `### Example Structure`

**Content source:** `../design-pattern-skill/design-pattern-review/patterns/*.md` already contains the when-to-apply, anti-patterns, and language considerations for every pattern. Adapt that content into the template format (Components → role list, Constraints → must/must-not rules, Anti-Patterns → Do NOT items, language considerations → Notes sections).

**Files to create:**

`templates/creational/`:
- `abstract-factory.md` — name: Abstract Factory, triggers: families of related objects, swap entire product family, related objects must be compatible
- `builder.md` — name: Builder, aliases: [Fluent Builder], triggers: many optional parameters, complex multi-step construction, different representations of same construction
- `factory-method.md` — name: Factory Method, triggers: subclass controls which class is instantiated, if/switch on type to create objects, object creation logic too complex for constructor
- `prototype.md` — name: Prototype, triggers: expensive object creation, clone existing object, create objects similar to existing at runtime
- `singleton.md` — name: Singleton, triggers: exactly one instance required, global coordination point, shared resource manager

`templates/structural/`:
- `adapter.md` — name: Adapter, aliases: [Wrapper], triggers: incompatible interface from third party, legacy component integration, normalize multiple external APIs
- `bridge.md` — name: Bridge, triggers: class hierarchy growing in two independent dimensions, separate abstraction from implementation, switch implementation at runtime
- `composite.md` — name: Composite, triggers: tree structure of objects, treat leaf and branch uniformly, recursive hierarchy
- `decorator.md` — name: Decorator, aliases: [Wrapper], triggers: add responsibilities dynamically without subclassing, middleware chain, cross-cutting concerns
- `facade.md` — name: Facade, triggers: simplify complex subsystem interface, decouple clients from subsystem, repeated orchestration of subsystem calls
- `flyweight.md` — name: Flyweight, triggers: large number of fine-grained similar objects, memory pressure from object count, shared intrinsic state
- `proxy.md` — name: Proxy, triggers: control access to object, lazy initialization, caching results, remote object access, access control

`templates/behavioral/` (in addition to strategy.md):
- `chain-of-responsibility.md` — name: Chain of Responsibility, triggers: multiple potential handlers for a request, handler not known a priori, configurable handler chain
- `command.md` — name: Command, triggers: undo/redo required, queue or log operations, parameterize actions as objects
- `interpreter.md` — name: Interpreter, triggers: simple grammar DSL, expression evaluator, configuration language
- `iterator.md` — name: Iterator, triggers: traverse collection without exposing structure, multiple simultaneous traversals
- `mediator.md` — name: Mediator, triggers: many objects communicate in complex ways, reduce direct references between objects, centralize communication
- `memento.md` — name: Memento, triggers: undo/redo state, save and restore object state, checkpoint without exposing internals
- `observer.md` — name: Observer, aliases: [Event, Listener], triggers: notify multiple subscribers on state change, event-driven notification, decouple event producer from consumers
- `state.md` — name: State, triggers: object behavior changes based on internal state, state machine with multiple transitions, eliminate large if/switch on state enum
- `template-method.md` — name: Template Method, triggers: same algorithm skeleton with variable steps, shared steps across subclasses with one different step
- `visitor.md` — name: Visitor, triggers: many distinct operations on object structure, add operations without changing element classes, double dispatch needed

`templates/modern/`:
- `repository.md` — name: Repository, triggers: decouple domain logic from data access, swap storage backend without changing business code, domain tests require real database
- `dependency-injection.md` — name: Dependency Injection, aliases: [DI], triggers: decouple components from dependency creation, hard to test because new Dependency inside logic, swap real vs mock in tests
- `circuit-breaker.md` — name: Circuit Breaker, triggers: external service calls can fail or slow, cascading failure prevention, fail fast on unhealthy downstream
- `event-sourcing.md` — name: Event Sourcing, triggers: full history of state changes required, audit log is business-critical, replay or reconstruct past state
- `cqrs.md` — name: CQRS, aliases: [Command Query Responsibility Segregation], triggers: read and write workloads have different scaling needs, complex domain writes with many simple read views
- `saga.md` — name: Saga, triggers: long-running distributed transaction, no 2-phase commit available, compensating transactions for rollback
- `retry-backoff.md` — name: Retry with Backoff, triggers: transient failures in network calls, idempotent operations that may fail temporarily
- `pub-sub.md` — name: Pub/Sub, aliases: [Publisher/Subscriber], triggers: decouple producers from multiple consumers, fanout notifications, async inter-service communication

`templates/architectural/`:
- `mvc-mvp-mvvm.md` — name: MVC/MVP/MVVM, triggers: UI application with separate presentation and business logic, testable UI components
- `hexagonal.md` — name: Hexagonal Architecture, aliases: [Ports and Adapters], triggers: domain must be independent of infrastructure, swap databases or transport without changing domain, domain tests without real database
- `clean-architecture.md` — name: Clean Architecture, triggers: business rules must be independent of frameworks, strict inward-only dependency rule, long-lived system surviving technology changes
- `layered.md` — name: Layered Architecture, aliases: [N-Tier], triggers: traditional enterprise application, presentation business data separation, team familiar with layered structure
- `microservices.md` — name: Microservices, triggers: independent deployability for different parts, different scaling requirements per capability, separate teams owning separate services
- `event-driven.md` — name: Event-Driven Architecture, triggers: high scalability with loose coupling, async reaction to state changes, decouple services via events
- `pipe-and-filter.md` — name: Pipe and Filter, triggers: data processing pipeline with composable steps, transformation steps need to be reorderable or replaceable

- [ ] **Step 1: Create all 34 template files**

For each file: populate frontmatter using the triggers listed above; write Overview (1-2 sentences), Components (3-5 role bullets), Constraints (3-5 must/must-not rules), Anti-Patterns (3-5 Do NOT items), Generic Example Structure (pseudocode skeleton), and Go/Java/Python/Rust sections (idiomatic notes + minimal structural example).

Reference content in `../design-pattern-skill/design-pattern-review/patterns/` maps as follows:
- `**When to apply**` → additional `triggers` entries
- `**When NOT to apply**` → `Anti-Patterns` section
- `**Language considerations**` → `### Notes` in each language section

- [ ] **Step 2: Run full test suite**

```bash
npx jest
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add templates/
git commit -m "feat: add all 34 pattern templates across creational, structural, behavioral, modern, architectural"
```

---

### Task 9: README and final push

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# design-pattern-mcp

An MCP (Model Context Protocol) server that provides design pattern structural constraints and anti-patterns to AI coding agents. Agents call this server during code generation to ensure they implement patterns correctly.

> **This server is not for human use.** It is called by AI coding agents (Claude Code, Cursor, Copilot, etc.).

## Tools

### `suggest_pattern`
Map a problem description to pattern name(s).

**Input:** `{ description: string, category?: "creational"|"structural"|"behavioral"|"modern"|"architectural" }`

**Output:** Up to 3 `PatternSuggestion[]` — `{ name, category, rationale, confidence }`

**Token cost:** ~50–100 tokens

### `get_template`
Get structural constraints and anti-patterns for a specific pattern in a specific language.

**Input:** `{ pattern: string, language: "go"|"java"|"python"|"rust"|"generic" }`

**Output:** Compact plain text with COMPONENTS, CONSTRAINTS, ANTI-PATTERNS, language-specific notes, example structure

**Token cost:** ~300–500 tokens

## Installation

```bash
git clone git@github.com:olivezuo/design-pattern-mcp.git
cd design-pattern-mcp
npm install
npm run build
```

## Register with Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "design-pattern-templates": {
      "command": "node",
      "args": ["/absolute/path/to/design-pattern-mcp/dist/index.js"]
    }
  }
}
```

## Register with Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "design-pattern-templates": {
      "command": "node",
      "args": ["/absolute/path/to/design-pattern-mcp/dist/index.js"]
    }
  }
}
```

## Register with Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "design-pattern-templates": {
      "command": "node",
      "args": ["/absolute/path/to/design-pattern-mcp/dist/index.js"]
    }
  }
}
```

## Pattern Coverage

35 patterns: Creational (5), Structural (7), Behavioral (11), Modern (8), Architectural (7).

## Development

```bash
npm test         # run tests
npm run build    # compile TypeScript to dist/
npm start        # run the MCP server
```
```

- [ ] **Step 2: Run final build and full test suite**

```bash
npm run build && npx jest
```

Expected: Build succeeds. All tests pass.

- [ ] **Step 3: Commit and push**

```bash
git add README.md docs/
git commit -m "docs: add README with tool reference and agent registration for Claude Code, Cursor, Windsurf"
git push -u origin main
```

---

## Self-Review

### Spec Coverage
- ✅ Two MCP tools `suggest_pattern` and `get_template` — Tasks 5, 4, 6
- ✅ Keyword scoring with 0.3 confidence threshold — Task 5
- ✅ Language-agnostic fallback for unknown languages — Task 4
- ✅ Levenshtein closest-match for unknown patterns — Task 4
- ✅ Template markdown format with frontmatter + named sections — Task 7 (reference), Task 8 (all 34)
- ✅ In-memory index (patternIndex + keywordIndex) built at startup — Task 3
- ✅ Compact plain-text response (no markdown headers) — Task 6 `formatTemplate`
- ✅ Token budget verified: < 2400 chars (~600 tokens) for Strategy+Go — Task 6 integration test
- ✅ stdio transport — Task 6
- ✅ Edge cases: unknown pattern (Levenshtein), unknown language (generic fallback), no matches (category summary) — Tasks 4, 5
- ✅ Deployment config for Claude Code, Cursor, Windsurf — Task 9 README

### Type Consistency
- `PatternEntry.antiPatterns` (camelCase) — defined in `types.ts`, used in `loader.ts`, `get-template.ts`, `index.ts` ✅
- Index key format `name.toLowerCase().replace(/[\s\/\-]+/g, '')` — used identically in `loader.ts` and `get-template.ts` ✅
- `PatternCategory` union type — used in `PatternFrontmatter` and as cast in `suggest.ts` ✅
- `formatTemplate(t: PatternTemplate, warning?)` — all fields from `PatternTemplate` in `types.ts` ✅
- `LoadResult` type returned from `loadTemplates` — used correctly in `index.ts` destructuring ✅
