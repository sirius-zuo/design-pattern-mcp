---
name: Bridge
category: structural
languages: [go, java, python, rust, generic]
triggers:
  - class hierarchy growing in two independent dimensions
  - separate abstraction from implementation
  - switch implementation at runtime without affecting abstraction
---

## Overview
Decouples an abstraction from its implementation so that the two can vary independently. Replaces a monolithic class hierarchy that grows in two dimensions with two separate hierarchies connected by composition.

## Components
- **Abstraction**: Defines the high-level control interface and holds a reference to an Implementor.
- **RefinedAbstraction**: Extends Abstraction with additional behavior; still delegates to Implementor.
- **Implementor** (interface): Declares low-level operations used by Abstraction. Independent of the Abstraction hierarchy.
- **ConcreteImplementor**: Provides a specific implementation of the Implementor interface.

## Constraints
- Abstraction must NOT contain platform-specific or implementation-specific code — that belongs in ConcreteImplementor.
- Abstraction must hold the Implementor via interface reference, not a concrete type.
- The two hierarchies (Abstraction and Implementor) must NOT reference each other's concrete types.
- Implementor interface must be narrow: only the primitives that Abstraction needs, not a full copy of Abstraction's API.

## Anti-Patterns
- Putting both the abstraction logic and implementation in a single class hierarchy (the problem Bridge solves).
- Making Implementor's interface mirror Abstraction's interface one-to-one — it should expose lower-level primitives.
- Switching the Implementor at runtime inside Abstraction logic — that decision should belong to the client or a factory.
- Overusing Bridge when a simple interface + implementation pair suffices and no independent variation is needed.

## Generic Example Structure
```
interface Implementor {
  operationImpl(): void
}

Abstraction {
  impl: Implementor
  operation(): void { impl.operationImpl() }
}

RefinedAbstraction extends Abstraction {
  operation(): void {
    preStep()
    impl.operationImpl()
    postStep()
  }
}

ConcreteImplementorA implements Implementor {
  operationImpl(): void { /* platform A */ }
}
```

## Go

### Notes
- Define Implementor as a Go interface; Abstraction is a struct holding that interface.
- No inheritance: use embedding or separate structs for RefinedAbstraction variants.
- Inject the Implementor via constructor to keep the bridge connection explicit.
- Useful when separating rendering engines from shape logic, or notification channels from notification types.

### Example Structure
```go
type Renderer interface{ RenderCircle(radius float64) }

type Shape struct{ renderer Renderer }

func NewShape(r Renderer) *Shape { return &Shape{renderer: r} }

type Circle struct {
    Shape
    radius float64
}

func (c *Circle) Draw() { c.renderer.RenderCircle(c.radius) }

type VectorRenderer struct{}
func (VectorRenderer) RenderCircle(r float64) { /* SVG */ }

type RasterRenderer struct{}
func (RasterRenderer) RenderCircle(r float64) { /* pixels */ }
```

## Java

### Notes
- Abstraction is typically an abstract class; Implementor is an interface.
- Use constructor injection to link the Abstraction to its Implementor.
- The Bridge prevents the N×M class explosion when you have N shapes and M renderers (you get N+M classes instead).
- Spring: inject the desired ConcreteImplementor via `@Qualifier` without changing any Abstraction code.

### Example Structure
```java
interface Renderer { void renderCircle(double radius); }

abstract class Shape {
    protected Renderer renderer;
    Shape(Renderer renderer) { this.renderer = renderer; }
    abstract void draw();
}

class Circle extends Shape {
    private double radius;
    Circle(double radius, Renderer renderer) { super(renderer); this.radius = radius; }
    @Override public void draw() { renderer.renderCircle(radius); }
}

class VectorRenderer implements Renderer {
    public void renderCircle(double r) { /* SVG */ }
}
```

## Python

### Notes
- Inject the implementor as a constructor parameter; type-annotate with the Protocol/ABC.
- Abstract base classes (`abc.ABC`) enforce that `draw()` is implemented in each RefinedAbstraction.
- Dataclasses make Abstraction definitions concise when they hold only the implementor reference plus simple fields.
- Replace conditional rendering logic spread across subclasses with Bridge to isolate each renderer.

### Example Structure
```python
from abc import ABC, abstractmethod

class Renderer(ABC):
    @abstractmethod
    def render_circle(self, radius: float) -> None: ...

class Shape(ABC):
    def __init__(self, renderer: Renderer) -> None:
        self._renderer = renderer

    @abstractmethod
    def draw(self) -> None: ...

class Circle(Shape):
    def __init__(self, radius: float, renderer: Renderer) -> None:
        super().__init__(renderer)
        self._radius = radius

    def draw(self) -> None:
        self._renderer.render_circle(self._radius)
```

## Rust

### Notes
- Model Implementor as a trait; Abstraction is a generic struct parameterized on `I: Implementor`.
- Static dispatch (`Shape<R: Renderer>`) is zero-cost; dynamic dispatch (`Box<dyn Renderer>`) enables runtime switching.
- `PhantomData` is unnecessary here because the implementor is a real field, not a type marker.
- Useful for separating platform-specific I/O (Implementor) from protocol logic (Abstraction).

### Example Structure
```rust
trait Renderer { fn render_circle(&self, radius: f64); }

struct Circle<R: Renderer> {
    radius: f64,
    renderer: R,
}

impl<R: Renderer> Circle<R> {
    fn draw(&self) { self.renderer.render_circle(self.radius); }
}

struct VectorRenderer;
impl Renderer for VectorRenderer {
    fn render_circle(&self, r: f64) { /* SVG */ }
}
```
