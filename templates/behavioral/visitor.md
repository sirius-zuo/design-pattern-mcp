---
name: Visitor
category: behavioral
languages: [go, java, python, rust, typescript, generic]
triggers:
  - many distinct operations on object structure
  - add operations without changing element classes
  - double dispatch needed
  - separate algorithm from object structure
---

## Overview
Lets you add new operations to existing object structures without modifying the classes. Each operation is encapsulated in a Visitor object that "visits" each element and performs the operation there.

## Components
- **Visitor** (interface): Declares a `visit(ConcreteElement)` overload for each concrete element type.
- **ConcreteVisitor**: Implements all visit methods, providing one coherent operation across the element hierarchy.
- **Element** (interface): Declares `accept(Visitor)` that dispatches to the correct visit method (double dispatch).
- **ConcreteElement**: Implements `accept()` by calling `visitor.visit(self)`.
- **ObjectStructure**: Iterates elements and calls `accept(visitor)` on each.

## Constraints
- Element subclasses must NOT add operation logic — operations live in Visitors.
- Adding a new Element type requires updating the Visitor interface and ALL ConcreteVisitors (the primary trade-off).
- `accept()` must call `visitor.visit(this)` — not a generic dispatch — to ensure the correct overload is selected.
- Visitor must NOT store mutable per-element state that crosses element boundaries; use the visitor's own fields for accumulated results.

## Anti-Patterns
- Adding an `instanceof`/type-switch in the Visitor instead of using proper double dispatch (defeats the pattern).
- Visitors that mutate elements' internal state (Elements should be read-only during a visit).
- Using Visitor when new element types are added frequently (every addition breaks all existing visitors).
- One giant Visitor class handling many unrelated operations — split into one Visitor per operation.

## Generic Example Structure
```
interface Visitor {
  visitCircle(c: Circle): void
  visitRectangle(r: Rectangle): void
}

interface Element {
  accept(v: Visitor): void
}

Circle implements Element {
  accept(v): void { v.visitCircle(self) }
}

Rectangle implements Element {
  accept(v): void { v.visitRectangle(self) }
}

AreaVisitor implements Visitor {
  total: float = 0
  visitCircle(c): void    { total += PI * c.radius^2 }
  visitRectangle(r): void { total += r.width * r.height }
}
```

## Go

### Notes
- Go lacks method overloading; simulate double dispatch with a type switch inside a single `Visit(Element)` method, or use an interface per element type.
- One Visitor interface with `VisitCircle(*Circle)` and `VisitRectangle(*Rectangle)` methods is the idiomatic translation.
- Rust enums + match is a better fit than Visitor for closed type sets in Go; Visitor shines for open extension.
- Return accumulated results from the Visitor's fields after traversal.

### Example Structure
```go
type Visitor interface {
    VisitCircle(c *Circle)
    VisitRect(r *Rectangle)
}

type Element interface{ Accept(v Visitor) }

type Circle struct{ Radius float64 }
func (c *Circle) Accept(v Visitor) { v.VisitCircle(c) }

type Rectangle struct{ Width, Height float64 }
func (r *Rectangle) Accept(v Visitor) { v.VisitRect(r) }

type AreaVisitor struct{ Total float64 }
func (av *AreaVisitor) VisitCircle(c *Circle)    { av.Total += math.Pi * c.Radius * c.Radius }
func (av *AreaVisitor) VisitRect(r *Rectangle)   { av.Total += r.Width * r.Height }
```

## Java

### Notes
- Java's method overloading resolves the correct `visit()` at compile time based on declared type — the `accept()` call is required to supply runtime type.
- Use a sealed interface + `switch` expression (Java 21 pattern matching) as a modern alternative to Visitor for closed hierarchies.
- Generify Visitor (`Visitor<R>`) to allow visitors that return a result instead of accumulating side effects.
- Eclipse JDT and Javac use the Visitor pattern extensively for AST traversal.

### Example Structure
```java
interface Visitor { void visitCircle(Circle c); void visitRect(Rectangle r); }
interface Element { void accept(Visitor v); }

record Circle(double radius) implements Element {
    public void accept(Visitor v) { v.visitCircle(this); }
}
record Rectangle(double width, double height) implements Element {
    public void accept(Visitor v) { v.visitRect(this); }
}

class AreaVisitor implements Visitor {
    double total;
    public void visitCircle(Circle c) { total += Math.PI * c.radius() * c.radius(); }
    public void visitRect(Rectangle r) { total += r.width() * r.height(); }
}
```

## Python

### Notes
- Python lacks method overloading; use `functools.singledispatch` or `functools.singledispatchmethod` for dynamic dispatch on element type.
- `@singledispatchmethod` in Python 3.8+ enables visitor-like dispatch without type switches.
- For closed hierarchies, `match` statements (Python 3.10+) with structural patterns are often cleaner.
- Doctest each visitor independently to verify the operation logic for every element type.

### Example Structure
```python
from __future__ import annotations
from abc import ABC, abstractmethod
import math

class Visitor(ABC):
    @abstractmethod
    def visit_circle(self, c: "Circle") -> None: ...
    @abstractmethod
    def visit_rect(self, r: "Rectangle") -> None: ...

class Element(ABC):
    @abstractmethod
    def accept(self, v: Visitor) -> None: ...

class Circle(Element):
    def __init__(self, radius: float) -> None: self.radius = radius
    def accept(self, v: Visitor) -> None: v.visit_circle(self)

class AreaVisitor(Visitor):
    def __init__(self) -> None: self.total = 0.0
    def visit_circle(self, c: Circle) -> None: self.total += math.pi * c.radius ** 2
    def visit_rect(self, r: "Rectangle") -> None: self.total += r.width * r.height
```

## Rust

### Notes
- Rust enums with `match` are often preferred over Visitor for closed element sets — exhaustive matching is built-in.
- For open extensibility, define a `Visitor` trait with one method per element type.
- `accept()` on each enum variant calls `visitor.visit_circle(self)` etc.
- Return values from visit methods (`fn visit_circle(&mut self, c: &Circle) -> f64`) give type-safe accumulated results.

### Example Structure
```rust
trait Visitor {
    fn visit_circle(&mut self, c: &Circle);
    fn visit_rect(&mut self, r: &Rectangle);
}

trait Element { fn accept(&self, v: &mut dyn Visitor); }

struct Circle { radius: f64 }
impl Element for Circle { fn accept(&self, v: &mut dyn Visitor) { v.visit_circle(self); } }

struct Rectangle { width: f64, height: f64 }
impl Element for Rectangle { fn accept(&self, v: &mut dyn Visitor) { v.visit_rect(self); } }

struct AreaVisitor { total: f64 }
impl Visitor for AreaVisitor {
    fn visit_circle(&mut self, c: &Circle) { self.total += std::f64::consts::PI * c.radius * c.radius; }
    fn visit_rect(&mut self, r: &Rectangle) { self.total += r.width * r.height; }
}
```

## TypeScript

### Notes
- Prefer discriminated unions + functions over Visitor class hierarchies for **closed** element sets — exhaustiveness checking is free.
- `switch` on `element.kind` with `default: element satisfies never` ensures all element types are handled at compile time.
- For **open** element sets (extensible types), use `element.accept(visitor)` dispatch with a `Visitor` interface to keep elements and operations decoupled.
- This approach applies cleanly to AST transforms, code analysis tools, schema validators, and domain model traversals.

### Example Structure
```typescript
// Closed element set — discriminated union approach (preferred)
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect';   width: number; height: number };

// Each "visitor" is a function — no class hierarchy needed
function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'rect':   return shape.width * shape.height;
    default:       return shape satisfies never;
  }
}

function perimeter(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return 2 * Math.PI * shape.radius;
    case 'rect':   return 2 * (shape.width + shape.height);
    default:       return shape satisfies never;
  }
}
```
