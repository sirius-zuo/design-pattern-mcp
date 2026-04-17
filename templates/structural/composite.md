---
name: Composite
category: structural
languages: [go, java, python, rust, generic]
triggers:
  - tree structure of objects
  - treat leaf and branch uniformly
  - recursive hierarchy
  - part-whole hierarchies
---

## Overview
Composes objects into tree structures to represent part-whole hierarchies. Lets clients treat individual objects (leaves) and compositions of objects (composites) uniformly through a common interface.

## Components
- **Component** (interface): The common interface for both Leaf and Composite. Declares the operation(s) clients call.
- **Leaf**: A basic element with no children. Implements Component by performing actual work.
- **Composite**: A container element that holds children (Components). Implements Component by delegating to children and aggregating results.
- **Client**: Operates on Component references; unaware whether it is dealing with a Leaf or Composite.

## Constraints
- Composite must store children as `[]Component` (or equivalent) — NOT as concrete Leaf or Composite types.
- Leaf must NOT implement child-management methods (add/remove child); those belong only to Composite.
- Client code must NOT check whether a Component is a Leaf or Composite — use polymorphism exclusively.
- Recursive operations on Composite must handle cycles if the tree could be a DAG; guard against infinite loops.

## Anti-Patterns
- Adding child-management methods (add, remove) to the Component interface, forcing Leaf to have no-op or error implementations.
- Using `isinstance` / `instanceof` checks to distinguish Leaf from Composite in client code.
- Creating a Composite with a fixed, known number of children typed as concrete classes (defeats uniform treatment).
- Ignoring the cost of deep recursive trees — consider iterative traversal for very deep hierarchies.

## Generic Example Structure
```
interface Component {
  operation(): string
}

Leaf implements Component {
  name: string
  operation(): string { return name }
}

Composite implements Component {
  children: []Component
  add(c: Component): void { children.append(c) }
  operation(): string {
    results = []
    for c in children { results.append(c.operation()) }
    return join(results)
  }
}
```

## Go

### Notes
- Define Component as a Go interface; Leaf and Composite are separate structs implementing it.
- Store children as `[]Component` — a slice of the interface type, not concrete structs.
- Use recursive methods on Composite; each child calls the same interface method.
- Useful for file system trees, UI widget hierarchies, and expression trees.

### Example Structure
```go
type Component interface{ Operation() string }

type Leaf struct{ Name string }
func (l *Leaf) Operation() string { return l.Name }

type Composite struct {
    Name     string
    children []Component
}

func (c *Composite) Add(child Component)    { c.children = append(c.children, child) }
func (c *Composite) Operation() string {
    var parts []string
    for _, ch := range c.children {
        parts = append(parts, ch.Operation())
    }
    return c.Name + "(" + strings.Join(parts, ",") + ")"
}
```

## Java

### Notes
- Declare Component as an interface (or abstract class if shared state is needed).
- Use `List<Component>` for the children collection in Composite.
- Child-management methods (`add`, `remove`, `getChild`) should be on Composite only, not the Component interface.
- The Composite pattern maps naturally to XML/JSON document trees and GUI component hierarchies.

### Example Structure
```java
interface Component { String operation(); }

class Leaf implements Component {
    private final String name;
    Leaf(String name) { this.name = name; }
    public String operation() { return name; }
}

class Composite implements Component {
    private final String name;
    private final List<Component> children = new ArrayList<>();
    Composite(String name) { this.name = name; }
    public void add(Component c) { children.add(c); }
    public String operation() {
        return name + "(" + children.stream()
            .map(Component::operation).collect(Collectors.joining(",")) + ")";
    }
}
```

## Python

### Notes
- A single abstract base class with `operation()` serves as Component; override in both Leaf and Composite.
- Use `list[Component]` for Composite's children; Python's dynamic typing makes the interface lightweight.
- `__iter__` on Composite enables `for child in composite` traversal.
- Use `abc.ABC` to enforce that all Component subclasses implement `operation()`.

### Example Structure
```python
from abc import ABC, abstractmethod

class Component(ABC):
    @abstractmethod
    def operation(self) -> str: ...

class Leaf(Component):
    def __init__(self, name: str) -> None:
        self._name = name
    def operation(self) -> str:
        return self._name

class Composite(Component):
    def __init__(self, name: str) -> None:
        self._name = name
        self._children: list[Component] = []

    def add(self, child: Component) -> None:
        self._children.append(child)

    def operation(self) -> str:
        results = [c.operation() for c in self._children]
        return f"{self._name}({','.join(results)})"
```

## Rust

### Notes
- Use an enum for small, closed Component hierarchies; use a trait object (`Box<dyn Component>`) for open hierarchies.
- `Vec<Box<dyn Component>>` stores heterogeneous children in Composite.
- Recursive enum types require `Box` to give the compiler a known size.
- Implement `Display` on the Component trait for pretty-printing tree structures.

### Example Structure
```rust
trait Component { fn operation(&self) -> String; }

struct Leaf { name: String }
impl Component for Leaf {
    fn operation(&self) -> String { self.name.clone() }
}

struct Composite {
    name: String,
    children: Vec<Box<dyn Component>>,
}
impl Composite {
    fn add(&mut self, c: Box<dyn Component>) { self.children.push(c); }
}
impl Component for Composite {
    fn operation(&self) -> String {
        let parts: Vec<_> = self.children.iter().map(|c| c.operation()).collect();
        format!("{}({})", self.name, parts.join(","))
    }
}
```
