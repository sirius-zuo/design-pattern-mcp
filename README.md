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
