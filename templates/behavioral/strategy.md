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
