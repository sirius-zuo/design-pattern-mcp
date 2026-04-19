# TypeScript Language Support Design

## Overview

Add TypeScript as a first-class language in the design-pattern-mcp service, alongside the existing Go, Java, Python, and Rust sections. All 38 pattern templates gain a `## TypeScript` section. JavaScript agents use the TypeScript section directly — TypeScript examples are valid JS with types stripped, so no separate `javascript` key is needed.

**Rationale:** TypeScript is the most common language for AI coding agents today. It has structural typing (like Go, unlike Java) and built-in language features (`Proxy`, decorators, discriminated unions) that change how several patterns are idiomatically expressed. The existing `Generic` fallback is sufficient for C#, Kotlin, and Swift because LLMs bridge the gap from Java + Generic trivially; TypeScript is the one language different enough to warrant its own section.

---

## What Changes

### 1. `src/loader.ts`

Add one entry to `LANG_HEADING`:

```typescript
typescript: 'TypeScript'
```

No other code changes required. The loader's existing section-extraction logic handles the new heading automatically.

### 2. `tests/loader.test.ts`

- Add `typescript` to the fixture's `languages:` frontmatter array
- Add `## TypeScript` with `### Notes` and `### Example Structure` subsections to the fixture markdown
- Add a test asserting `entry.languageSections.get('typescript')!.notes` contains the fixture text

### 3. All 38 template files

Each template receives:

**Frontmatter:** `typescript` added to the `languages` array.

**New section at the end of each file:**

```markdown
## TypeScript

### Notes
- [3-4 TypeScript-specific idiomatic bullets]

### Example Structure
```typescript
// minimal structural example
```
```

**TypeScript notes content guidelines per category:**

- **Behavioral (Strategy, State, Command, Observer, etc.):**
  - Structural typing — no `implements` keyword needed; a class satisfying a `interface` shape is automatically compatible
  - State pattern: prefer discriminated unions (`type State = 'open' | 'closed'`) over class hierarchies for simple state machines
  - Observer: `EventEmitter` (Node.js) or RxJS `Subject` are idiomatic; raw Observer class hierarchy is rarely used in TS
  - Strategy: single-method strategies work naturally as function types (`type Strategy = (input: Input) => Output`)

- **Structural (Decorator, Proxy, Adapter, etc.):**
  - Decorator pattern: `@decorator` syntax (Stage 3 proposal, widely available in Angular/NestJS) is idiomatic for cross-cutting concerns
  - Proxy pattern: the built-in `Proxy` object handles get/set/apply traps natively — no wrapper class needed for simple cases
  - Adapter: TypeScript's structural typing means an adapter only needs to satisfy the target interface shape, not extend a class

- **Creational (Singleton, Builder, Factory, etc.):**
  - Singleton: module-level `export const instance = new MyClass()` is the idiomatic TS singleton — class-based singletons with `getInstance()` are considered legacy
  - Builder: method chaining with `this` return types (`add(x: T): this`) enables fluent builders without subclassing

- **Modern (Repository, DI, Circuit Breaker, etc.):**
  - Repository: always `async`/`await`; return `Promise<T | null>` for nullable lookups
  - Dependency Injection: NestJS `@Injectable()` + constructor injection is idiomatic; InversifyJS for non-framework DI
  - Circuit Breaker / Retry: `opossum` (Node.js) or manual `async` wrappers with closure state

- **Architectural (Hexagonal, Clean, Layered, etc.):**
  - Port interfaces defined with TypeScript `interface`; adapters implement via structural typing
  - NestJS modules provide the wiring layer for Hexagonal/Clean Architecture in TypeScript server apps

### 4. `README.md`

Update the language list in the "Tools" section to include TypeScript:

```
**Input:** `{ pattern: string, language: "go"|"java"|"python"|"rust"|"typescript"|"generic" }`
```

---

## Scope

**In scope:**
- `loader.ts` — one-line `LANG_HEADING` addition
- `loader.test.ts` — fixture update + one new test
- 38 template files — `languages` frontmatter + `## TypeScript` section
- `README.md` — language list update

**Out of scope:**
- `javascript` as a separate language key (TypeScript section covers JS agents)
- C#, Kotlin, Swift (Generic + Java fallback is sufficient for LLMs)
- Any changes to `suggest.ts`, `get-template.ts`, or `index.ts`

---

## Testing

Existing tests: all 27 pass unchanged (loader, get-template, suggest, types, integration).

New tests:
- `loader.test.ts`: fixture includes TypeScript section; assert `languageSections.get('typescript')` is populated correctly
- `integration.test.ts`: existing Strategy+Go test unchanged; TypeScript coverage verified via loader unit test

No integration test change needed — the integration test verifies the loader works end-to-end with real templates; once the template files have `## TypeScript` sections, `patternIndex.get('strategy')!.languageSections.get('typescript')` will be populated and the existing loader test covers that path.
