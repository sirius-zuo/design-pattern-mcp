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

**Input:** `{ pattern: string, language: "go"|"java"|"python"|"rust"|"typescript"|"generic" }`

**Output:** Compact plain text with COMPONENTS, CONSTRAINTS, ANTI-PATTERNS, language-specific notes, example structure

**Token cost:** ~300–500 tokens

## Installation

```bash
git clone git@github.com:sirius-zuo/design-pattern-mcp.git
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

## Register with GitHub Copilot (VS Code)

Add to `.vscode/mcp.json` (project) or user settings:

```json
{
  "servers": {
    "design-pattern-templates": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/design-pattern-mcp/dist/index.js"]
    }
  }
}
```

## Usage in Claude Desktop

Once registered, you can ask Claude to use the tools directly in conversation. The typical workflow is: **suggest a pattern first**, then **fetch the full template** for the one you want to implement.

---

### Example 1 — Find the right pattern

**You ask Claude:**

> I need to support multiple payment methods like credit card, PayPal, and crypto that can be swapped at runtime. What pattern should I use?

**Claude calls `suggest_pattern` and returns:**

```
[
  {
    "name": "Strategy",
    "category": "behavioral",
    "rationale": "multiple interchangeable algorithms",
    "confidence": 0.67
  },
  {
    "name": "Decorator",
    "category": "structural",
    "rationale": "add responsibilities dynamically without subclassing",
    "confidence": 0.50
  },
  {
    "name": "Saga",
    "category": "modern",
    "rationale": "long-running distributed transaction",
    "confidence": 0.33
  }
]
```

Strategy is the strongest match. You then ask for the full template.

---

### Example 2 — Get the full template for your language

**You ask Claude:**

> Give me the Strategy pattern template for TypeScript.

**Claude calls `get_template` with `{ pattern: "strategy", language: "typescript" }` and returns:**

```
Pattern: Strategy
Language: typescript

COMPONENTS:
- **Context**: Holds a reference to a Strategy. Delegates algorithm execution to it. Contains NO algorithm logic itself.

CONSTRAINTS:
- Context must NOT contain algorithm logic; all logic lives in ConcreteStrategy.

ANTI-PATTERNS:
- Embedding the if/else or switch selection logic inside Context (defeats the purpose).

TYPESCRIPT-SPECIFIC NOTES:
- Define single-method stateless strategies as function types: `type SortStrategy = (data: number[]) => number[]` — no interface or class needed.
- Multi-method or stateful strategies: use an `interface` with structural typing — no `implements` declaration required.
- Inject via constructor (`constructor(private strategy: SortStrategy)`) for immutability; use a setter only when runtime switching is required.
- `Context` holds a field typed to the function type or interface; calling it is `this.strategy(params)` or `this.strategy.execute(params)`.

EXAMPLE STRUCTURE:
```typescript
type Sorter = (data: number[]) => number[];

class SortContext {
  constructor(private strategy: Sorter) {}
  setStrategy(s: Sorter): void { this.strategy = s; }
  run(data: number[]): number[] { return this.strategy(data); }
}

// Usage — any function with the right signature is a valid strategy
const ctx = new SortContext(data => [...data].sort((a, b) => a - b));
ctx.run([3, 1, 2]); // [1, 2, 3]

// Interface-based for stateful strategies
interface PricingStrategy { calculate(basePrice: number): number; }
class DiscountStrategy implements PricingStrategy {
  constructor(private pct: number) {}
  calculate(base: number): number { return base * (1 - this.pct); }
}
```


**Claude then uses this output as grounding constraints when writing your actual payment service code — ensuring the context doesn't embed algorithm logic, strategies are injected via constructor, and the TypeScript-idiomatic function-type approach is used.**



## Pattern Coverage

38 patterns across 5 categories:
- **Creational** (5): Abstract Factory, Builder, Factory Method, Prototype, Singleton
- **Structural** (7): Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy
- **Behavioral** (11): Chain of Responsibility, Command, Interpreter, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor
- **Modern** (8): Circuit Breaker, CQRS, Dependency Injection, Event Sourcing, Pub/Sub, Repository, Retry with Backoff, Saga
- **Architectural** (7): Clean Architecture, Event-Driven Architecture, Hexagonal Architecture, Layered Architecture, Microservices, MVC/MVP/MVVM, Pipe and Filter

## Development

```bash
npm test         # run tests
npm run build    # compile TypeScript to dist/
npm start        # run the MCP server
```
