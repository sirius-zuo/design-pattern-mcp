# Design Pattern MCP Template Service — Design Spec

## Context

The `design-pattern-review` skill (see `olivezuo/design-pattern-skill`) identifies where design patterns should be applied but does not generate code. When an AI coding agent acts on those recommendations, it needs reliable structural guidance to implement patterns correctly — without consuming excessive context window tokens.

This MCP server provides that guidance. It is **never called by humans directly**; it is called by AI coding agents (Claude Code, Cursor, Copilot, etc.) to retrieve pattern implementation constraints and avoid common mistakes. The two core design constraints are:

1. **Token efficiency** — responses must be compact; agents pay per token and have limited context
2. **Precision** — structural rules and anti-patterns, not tutorials or prose

This server is independent of the review skill and can be used standalone.

---

## MCP Tools

The server exposes exactly two tools.

### Tool 1: `suggest_pattern`

**Signature:**
```
suggest_pattern(description: string, category?: string) → PatternSuggestion[]
```

**Purpose:** Map a problem description to pattern name(s). Used when the agent knows the problem but not which pattern to apply.

**Parameters:**
- `description`: The agent describes the situation (e.g., `"multiple sorting algorithms need to be interchangeable at runtime"`)
- `category` (optional): narrows search — `"creational"`, `"structural"`, `"behavioral"`, `"modern"`, or `"architectural"`

**Response:** Ranked list of up to 3 matches:
```json
[
  { "name": "Strategy", "category": "behavioral", "rationale": "Multiple interchangeable algorithms selected at runtime", "confidence": 0.9 },
  { "name": "Command",  "category": "behavioral", "rationale": "Encapsulate operations as objects for deferred execution", "confidence": 0.4 }
]
```

**Target token cost:** 50–100 tokens per response.

**Matching logic:** Keyword scoring against each template's `triggers` list (no external model). Returns top 3 by score with confidence values. If no match scores above 0.3 (low confidence threshold), returns all patterns in the requested `category` (if provided), or returns a summary of pattern counts per category with a message suggesting the agent narrow the search by category.

---

### Tool 2: `get_template`

**Signature:**
```
get_template(pattern: string, language: string) → PatternTemplate
```

**Purpose:** Fetch structural constraints for a specific pattern in a specific language. Used when the agent knows which pattern to implement.

**Parameters:**
- `pattern`: exact pattern name — `"Strategy"`, `"Observer"`, `"Circuit Breaker"`, etc.
- `language`: `"go"`, `"java"`, `"python"`, `"rust"`, or `"generic"` (language-agnostic)

**Response format** (plain text, not markdown — agents don't need headers):
```
Pattern: Strategy
Language: Go

COMPONENTS:
- Context: holds a Strategy interface reference, delegates algorithm execution to it
- Strategy (interface): defines the algorithm contract (typically 1 method)
- ConcreteStrategy: implements Strategy, encapsulates one algorithm variant

CONSTRAINTS:
- Context must NOT contain algorithm logic; all logic lives in ConcreteStrategy
- Strategy interface must be narrow (1-2 methods max)
- Context switches strategies via a setter, not by recreating itself

ANTI-PATTERNS:
- Do NOT embed the strategy selection logic (if/switch) inside Context
- Do NOT use empty interface{} as the strategy type — define a typed interface
- Do NOT share mutable state between ConcreteStrategy instances

GO-SPECIFIC NOTES:
- Strategy interface satisfaction is implicit (no 'implements' keyword)
- Idiomatic: for single-method strategies, a function type (func(args) result) is preferred over a full interface
- Use interface-based strategy when ConcreteStrategy needs to hold state
```

**Target token cost:** 300–500 tokens per response.

**Critically:** Only the requested language's content is returned. No other languages are included in the response.

---

## Template File Format

One markdown file per pattern. Stored in `templates/<category>/<pattern-name>.md`.

```markdown
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
---

## Overview
Defines a family of algorithms, encapsulates each one, and makes them interchangeable. The caller selects which algorithm to use.

## Components
- **Context**: Maintains a reference to a Strategy. Delegates execution to it. Does NOT implement algorithm logic.
- **Strategy** (interface/trait/abstract): Declares the common interface for all algorithms.
- **ConcreteStrategy**: Implements one algorithm variant.

## Constraints
- Context must not contain algorithm logic.
- Strategy interface must be narrow.
- Context must not decide which ConcreteStrategy to use — that is the caller's responsibility.

## Anti-Patterns
- Embedding the if/switch selection logic inside Context.
- Using a base class instead of an interface for Strategy (breaks substitutability).
- Passing raw data blobs to Strategy instead of a well-defined parameter type.

## Generic Example Structure
```
Context {
  strategy: Strategy
  setStrategy(s: Strategy)
  execute(params) { return strategy.run(params) }
}

interface Strategy {
  run(params): result
}

ConcreteStrategyA implements Strategy { run(params): result { ... } }
ConcreteStrategyB implements Strategy { run(params): result { ... } }
```

## Go
### Notes
- Interface satisfaction is implicit.
- For single-method strategies, a function type is idiomatic: `type Strategy func(params) result`
- Use a struct-based interface when ConcreteStrategy must hold state.

### Example Structure
```go
type Strategy interface { Execute(params Params) Result }
type Context struct { strategy Strategy }
func (c *Context) SetStrategy(s Strategy) { c.strategy = s }
func (c *Context) Run(p Params) Result    { return c.strategy.Execute(p) }
type ConcreteA struct{}
func (ConcreteA) Execute(p Params) Result { ... }
```

## Java
### Notes
- ...

### Example Structure
```java
// ...
```

## Python
### Notes
- ...

### Example Structure
```python
# ...
```

## Rust
### Notes
- ...

### Example Structure
```rust
// ...
```
```

---

## Server Architecture

```
design-pattern-mcp/
  src/
    index.ts              # MCP server entry point; registers tools; starts stdio listener
    loader.ts             # Reads templates/**/*.md at startup; builds in-memory index
    tools/
      suggest.ts          # suggest_pattern implementation; keyword scoring
      get-template.ts     # get_template implementation; section extraction + formatting
    types.ts              # PatternEntry, PatternSuggestion, PatternTemplate types
  templates/
    creational/           # abstract-factory.md, builder.md, factory-method.md, prototype.md, singleton.md
    structural/           # adapter.md, bridge.md, composite.md, decorator.md, facade.md, flyweight.md, proxy.md
    behavioral/           # chain-of-responsibility.md, command.md, interpreter.md, iterator.md,
                          # mediator.md, memento.md, observer.md, state.md, strategy.md,
                          # template-method.md, visitor.md
    modern/               # repository.md, dependency-injection.md, circuit-breaker.md,
                          # event-sourcing.md, cqrs.md, saga.md, retry-backoff.md, pub-sub.md
    architectural/        # mvc-mvp-mvvm.md, hexagonal.md, clean-architecture.md, layered.md,
                          # microservices.md, event-driven.md, pipe-and-filter.md
  package.json
  tsconfig.json
```

### Startup Flow

1. `loader.ts` reads all `templates/**/*.md` files
2. Parses frontmatter (gray-matter) + named sections into `PatternEntry` objects
3. Builds two indexes in memory:
   - `patternIndex: Map<string, PatternEntry>` — keyed by lowercase pattern name + aliases
   - `keywordIndex: Map<string, string[]>` — trigger phrase → pattern names (for suggest_pattern)
4. MCP server registers `suggest_pattern` and `get_template`, begins listening on stdio

### Runtime Flow

**`get_template('Strategy', 'Go')`:**
1. O(1) lookup in `patternIndex`
2. Extract: Components, Constraints, Anti-Patterns, Go Notes, Go Example Structure
3. Format as compact plain text (no markdown headers — agents don't need them)
4. Return — zero disk I/O at query time

**`suggest_pattern('multiple interchangeable algorithms')`:**
1. Tokenize description into words
2. Score each pattern by fuzzy-matching description tokens against its `triggers` list
3. Return top 3 by score with rationale and confidence

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| Unknown pattern name | Return error with closest match: `"Pattern 'Stratgey' not found. Did you mean 'Strategy'?"` |
| Unknown language | Fall back to `generic` template; note: `"No Go-specific notes available; returning generic template"` |
| No `suggest_pattern` matches (all scores < 0.3) | If `category` provided: return all patterns in that category. Otherwise: return pattern counts per category and suggest narrowing with `category` |
| Pattern exists, no language section | Serve generic section with note that language-specific guidance is not yet available |

---

## Deployment

Runs as a local MCP server on stdio transport. No network access required — all data is local files.

**Install:**
```bash
git clone git@github.com:olivezuo/design-pattern-mcp.git
cd design-pattern-mcp
npm install
npm run build
```

**Register in Claude Code** (`~/.claude/settings.json`):
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

Other agents (Cursor, Copilot, etc.) support MCP servers through their own settings — the server binary is the same; only the config file location differs.

---

## Token Budget Summary

| Tool | Target response size | Purpose |
|------|---------------------|---------|
| `suggest_pattern` | 50–100 tokens | Pattern name discovery |
| `get_template` | 300–500 tokens | Structural constraints + anti-patterns for one language |

An agent implementing two patterns in one session pays approximately 800–1000 tokens in MCP calls — well within budget.

---

## Verification

1. `npm run build` compiles without errors
2. Register in Claude Code; verify `suggest_pattern` and `get_template` appear as available tools
3. Call `suggest_pattern("multiple interchangeable algorithms")` → returns Strategy as top match
4. Call `get_template("Strategy", "go")` → returns Go-specific constraints, no other languages
5. Call `get_template("Strategy", "kotlin")` → falls back to generic with a note
6. Call `get_template("Stratgey", "go")` → returns helpful error with closest match
7. Measure token count of `get_template` response → target under 500 tokens

---

## Out of Scope

- Web/HTTP transport (stdio is sufficient for local agent use)
- Authentication (local server, no network exposure)
- Integration with the `design-pattern-review` skill (possible future enhancement; not in this spec)
- A UI or developer-facing interface (this server is agent-only)
