---
name: Builder
category: creational
aliases: [Fluent Builder]
languages: [go, java, python, rust, typescript, generic]
triggers:
  - many optional parameters
  - complex multi-step construction
  - different representations of same construction process
  - avoid telescoping constructors
---

## Overview
Separates the construction of a complex object from its representation, allowing the same construction process to produce different results. Especially useful when an object requires many optional or ordered configuration steps.

## Components
- **Builder** (interface): Declares the steps to build the product. Each step returns the builder for chaining.
- **ConcreteBuilder**: Implements the Builder steps and accumulates parts into the product.
- **Director** (optional): Orchestrates a fixed sequence of builder steps for a predefined configuration.
- **Product**: The complex object being constructed. Assembled from parts added by builder steps.

## Constraints
- Builder must enforce that `Build()` / `build()` is called only after required fields are set; return an error or panic on missing required state.
- Product must be immutable after `Build()` returns — no setters on the finished object.
- Director must NOT know the concrete builder type; it depends only on the Builder interface.
- Each builder step must return `self` / the builder to enable method chaining.

## Anti-Patterns
- Setting fields on the product directly inside builder steps (breaks encapsulation; product should be assembled only in `Build()`).
- Reusing a builder instance after `Build()` without resetting state — leads to polluted products.
- Skipping the Builder and adding telescoping constructors with default arguments instead.
- Making Director mandatory when there is only one construction sequence — unnecessary indirection.

## Generic Example Structure
```
interface Builder {
  setEngine(e: Engine): Builder
  setWheels(n: int): Builder
  setColor(c: string): Builder
  build(): Car
}

ConcreteCarBuilder implements Builder {
  private parts: CarParts = {}
  setEngine(e) { parts.engine = e; return self }
  setWheels(n) { parts.wheels = n; return self }
  setColor(c)  { parts.color  = c; return self }
  build(): Car { validate(parts); return Car(parts) }
}

Director {
  buildSportsCar(b: Builder): Car {
    return b.setEngine(V8).setWheels(4).setColor("red").build()
  }
}
```

## Go

### Notes
- Go lacks method chaining on value receivers that mutate state; use pointer receivers and return `*Builder`.
- Functional options (`type Option func(*config)`) are idiomatic for optional parameters and can replace Builder for simpler cases.
- Validate all required fields inside the `Build()` method and return `(*Product, error)`.
- Keep the builder unexported if it should only be created through a `NewBuilder()` constructor.

### Example Structure
```go
type CarBuilder struct {
    engine string
    wheels int
    color  string
}

func NewCarBuilder() *CarBuilder { return &CarBuilder{} }

func (b *CarBuilder) SetEngine(e string) *CarBuilder { b.engine = e; return b }
func (b *CarBuilder) SetWheels(n int) *CarBuilder    { b.wheels = n; return b }
func (b *CarBuilder) SetColor(c string) *CarBuilder  { b.color = c; return b }

func (b *CarBuilder) Build() (*Car, error) {
    if b.engine == "" { return nil, errors.New("engine required") }
    return &Car{engine: b.engine, wheels: b.wheels, color: b.color}, nil
}
```

## Java

### Notes
- The classic Java pattern: make the outer class immutable with a `private` constructor; inner `Builder` class sets fields then calls `new Product(this)`.
- Lombok `@Builder` annotation auto-generates the builder; use `@Builder.Default` for default field values.
- Use `@NonNull` or explicit null checks inside `build()` for required fields.
- Generic builders with `T extends Builder<T>` support fluent inheritance in class hierarchies.

### Example Structure
```java
public final class Car {
    private final String engine;
    private final int wheels;
    private final String color;

    private Car(Builder b) { this.engine = b.engine; this.wheels = b.wheels; this.color = b.color; }

    public static class Builder {
        private String engine; // required
        private int wheels = 4;
        private String color = "white";

        public Builder engine(String e) { this.engine = e; return this; }
        public Builder wheels(int n)    { this.wheels = n; return this; }
        public Builder color(String c)  { this.color = c; return this; }

        public Car build() {
            Objects.requireNonNull(engine, "engine required");
            return new Car(this);
        }
    }
}
```

## Python

### Notes
- Use `dataclasses` with `field(default=...)` for simple optional parameters rather than full Builder.
- For complex multi-step construction, return `self` from each setter for chaining.
- `@dataclass(frozen=True)` on the Product ensures immutability after construction.
- Type-check required fields in `build()` and raise `ValueError` for missing ones.

### Example Structure
```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass(frozen=True)
class Car:
    engine: str
    wheels: int
    color: str

class CarBuilder:
    def __init__(self) -> None:
        self._engine: Optional[str] = None
        self._wheels: int = 4
        self._color: str = "white"

    def set_engine(self, e: str) -> "CarBuilder":
        self._engine = e; return self

    def set_color(self, c: str) -> "CarBuilder":
        self._color = c; return self

    def build(self) -> Car:
        if not self._engine:
            raise ValueError("engine required")
        return Car(engine=self._engine, wheels=self._wheels, color=self._color)
```

## Rust

### Notes
- The typestate builder pattern (encoding required fields in generic parameters) catches missing fields at compile time.
- For simpler cases, use a plain struct with setter methods returning `&mut Self` or `Self`.
- `derive(Default)` on the builder struct reduces boilerplate for optional fields.
- Return `Result<Product, BuildError>` from `build()` to surface validation errors.

### Example Structure
```rust
#[derive(Default)]
struct CarBuilder {
    engine: Option<String>,
    wheels: u8,
    color: String,
}

impl CarBuilder {
    fn engine(mut self, e: impl Into<String>) -> Self { self.engine = Some(e.into()); self }
    fn wheels(mut self, n: u8) -> Self { self.wheels = n; self }
    fn color(mut self, c: impl Into<String>) -> Self { self.color = c.into(); self }

    fn build(self) -> Result<Car, &'static str> {
        let engine = self.engine.ok_or("engine required")?;
        Ok(Car { engine, wheels: self.wheels, color: self.color })
    }
}
```

## TypeScript

### Notes
- Method chaining with `this` return types (`add(x: T): this`) works correctly in subclasses without covariant return type issues.
- Immutable builders: return `new Builder({ ...this.state, [key]: value })` from each setter to avoid shared mutable state.
- `Required<BuilderState>` in the `build()` signature enforces all required fields have been set before building.
- For simple config objects a plain `Partial<Config>` accumulator with a final `validate()` is often simpler than a full Builder class.

### Example Structure
```typescript
class QueryBuilder {
  private state: { table?: string; conditions: string[]; limitVal?: number } = { conditions: [] };

  from(table: string): this          { this.state.table = table; return this; }
  where(condition: string): this     { this.state.conditions.push(condition); return this; }
  limit(n: number): this             { this.state.limitVal = n; return this; }

  build(): string {
    if (!this.state.table) throw new Error('table is required');
    let q = `SELECT * FROM ${this.state.table}`;
    if (this.state.conditions.length) q += ` WHERE ${this.state.conditions.join(' AND ')}`;
    if (this.state.limitVal)          q += ` LIMIT ${this.state.limitVal}`;
    return q;
  }
}

// Usage
const sql = new QueryBuilder()
  .from('users')
  .where('active = true')
  .where("role = 'admin'")
  .limit(10)
  .build();
// SELECT * FROM users WHERE active = true AND role = 'admin' LIMIT 10
```
