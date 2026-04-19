---
name: Interpreter
category: behavioral
languages: [go, java, python, rust, typescript, generic]
triggers:
  - simple grammar DSL
  - expression evaluator
  - configuration language
  - parse and execute simple sentences in a language
---

## Overview
Defines a representation for a grammar along with an interpreter that processes sentences in that grammar. Best suited for simple, stable grammars where the overhead of a parser generator is not warranted.

## Components
- **AbstractExpression**: Declares the `interpret(context)` method shared by all grammar rules.
- **TerminalExpression**: Implements `interpret()` for the terminal symbols of the grammar (literals, identifiers).
- **NonTerminalExpression**: Implements `interpret()` for composite grammar rules; holds references to child expressions.
- **Context**: Contains global information needed during interpretation (variable bindings, input state).
- **Client**: Builds the abstract syntax tree (AST) and triggers interpretation.

## Constraints
- Grammar must be small and stable — each grammar rule maps to one class, so large grammars create class explosion.
- `interpret()` must NOT modify the expression tree; the tree is immutable data, context carries mutable state.
- NonTerminalExpression must delegate to child expressions exclusively, not contain inline sub-parsing logic.
- Complex grammars should use a parser generator (ANTLR, YACC) rather than this pattern.

## Anti-Patterns
- Implementing a full programming language with this pattern (class explosion, poor performance).
- Mixing parsing logic into expression classes — parsing should happen in a separate parser step.
- Modifying the AST during interpretation (context carries mutable state; the tree does not).
- Skipping the Context object and threading state through method parameters (unscalable for complex grammars).

## Generic Example Structure
```
interface Expression {
  interpret(ctx: Context): int
}

NumberExpression implements Expression {
  value: int
  interpret(ctx): int { return value }
}

VariableExpression implements Expression {
  name: string
  interpret(ctx): int { return ctx.lookup(name) }
}

AddExpression implements Expression {
  left, right: Expression
  interpret(ctx): int { return left.interpret(ctx) + right.interpret(ctx) }
}

// Build AST: (x + 5) where x=3
ctx = Context{x: 3}
expr = AddExpression(VariableExpression("x"), NumberExpression(5))
print(expr.interpret(ctx))  // 8
```

## Go

### Notes
- Define `Expression` as a Go interface with a single `Eval(ctx *Context) Value` method.
- Represent AST nodes as structs; NonTerminalExpression structs embed or reference child `Expression` values.
- Use recursive descent parsing to build the AST before calling `Eval`.
- For boolean DSLs (filter/rule engines), this pattern is a clean fit.

### Example Structure
```go
type Context map[string]int

type Expression interface{ Eval(ctx Context) int }

type Num struct{ Val int }
func (n Num) Eval(_ Context) int { return n.Val }

type Var struct{ Name string }
func (v Var) Eval(ctx Context) int { return ctx[v.Name] }

type Add struct{ Left, Right Expression }
func (a Add) Eval(ctx Context) int { return a.Left.Eval(ctx) + a.Right.Eval(ctx) }
```

## Java

### Notes
- Implement each grammar rule as a class implementing `Expression` or extending an abstract base.
- Records (Java 16+) are ideal for immutable terminal and non-terminal expression nodes.
- Use `Map<String, Integer>` as Context for simple variable bindings.
- For richer evaluation (error handling, types), return `Optional<Value>` or a sealed `Result` type.

### Example Structure
```java
interface Expression { int interpret(Map<String, Integer> ctx); }

record Num(int value) implements Expression {
    public int interpret(Map<String, Integer> ctx) { return value; }
}

record Var(String name) implements Expression {
    public int interpret(Map<String, Integer> ctx) { return ctx.get(name); }
}

record Add(Expression left, Expression right) implements Expression {
    public int interpret(Map<String, Integer> ctx) {
        return left.interpret(ctx) + right.interpret(ctx);
    }
}
```

## Python

### Notes
- AST nodes are naturally modeled as dataclasses or named tuples.
- Python's `ast` module is the standard for Python language parsing; use Interpreter for custom DSLs only.
- Visitor pattern can be combined with Interpreter to separate traversal from interpretation logic.
- Type-annotate `Context` as `dict[str, int]` and use `Protocol` for the Expression interface.

### Example Structure
```python
from __future__ import annotations
from dataclasses import dataclass

Context = dict[str, int]

class Expression:
    def interpret(self, ctx: Context) -> int: ...

@dataclass
class Num(Expression):
    value: int
    def interpret(self, ctx: Context) -> int: return self.value

@dataclass
class Var(Expression):
    name: str
    def interpret(self, ctx: Context) -> int: return ctx[self.name]

@dataclass
class Add(Expression):
    left: Expression
    right: Expression
    def interpret(self, ctx: Context) -> int:
        return self.left.interpret(ctx) + self.right.interpret(ctx)
```

## Rust

### Notes
- Use an `enum` for the AST node type — this is idiomatic Rust and enables exhaustive `match`.
- `Box<Expr>` in recursive variants prevents infinite-size types.
- Implement `eval(&self, ctx: &Context) -> i64` on the enum directly or via a separate interpreter struct.
- Pattern match on all variants to ensure new grammar rules are handled at compile time.

### Example Structure
```rust
use std::collections::HashMap;
type Context = HashMap<String, i64>;

enum Expr {
    Num(i64),
    Var(String),
    Add(Box<Expr>, Box<Expr>),
}

impl Expr {
    fn eval(&self, ctx: &Context) -> i64 {
        match self {
            Expr::Num(v) => *v,
            Expr::Var(name) => *ctx.get(name).unwrap_or(&0),
            Expr::Add(l, r) => l.eval(ctx) + r.eval(ctx),
        }
    }
}
```

## TypeScript

### Notes
- Discriminated unions model expression ASTs without class hierarchies: `type Expr = { kind: 'literal'; val: number } | { kind: 'add'; left: Expr; right: Expr }`.
- A recursive function over the discriminated union is more idiomatic than a Visitor class hierarchy for closed expression sets.
- TypeScript's `switch` exhaustiveness check (`default: expr satisfies never`) ensures all expression types are handled.
- Use `Map<string, number>` as the context/environment for variable-binding interpreters.

### Example Structure
```typescript
type Expr =
  | { kind: 'literal'; val: number }
  | { kind: 'add'; left: Expr; right: Expr }
  | { kind: 'mul'; left: Expr; right: Expr };

function evaluate(expr: Expr, env: Map<string, number> = new Map()): number {
  switch (expr.kind) {
    case 'literal': return expr.val;
    case 'add':     return evaluate(expr.left, env) + evaluate(expr.right, env);
    case 'mul':     return evaluate(expr.left, env) * evaluate(expr.right, env);
    default:        return expr satisfies never;
  }
}

// Usage: (3 + 4) * 2
const ast: Expr = {
  kind: 'mul',
  left: { kind: 'add', left: { kind: 'literal', val: 3 }, right: { kind: 'literal', val: 4 } },
  right: { kind: 'literal', val: 2 },
};
evaluate(ast); // 14
```
