---
name: Prototype
category: creational
languages: [go, java, python, rust, generic]
triggers:
  - expensive object creation
  - clone existing object
  - create objects similar to existing at runtime
  - copy complex object graphs
---

## Overview
Specifies the kind of objects to create using a prototypical instance, and creates new objects by copying that prototype. Avoids the cost of re-running expensive initialization by cloning a pre-built instance.

## Components
- **Prototype** (interface): Declares the `clone()` method that all concrete prototypes implement.
- **ConcretePrototype**: Implements `clone()` to return a deep or shallow copy of itself.
- **Client**: Creates new objects by calling `clone()` on a prototype rather than using a constructor.
- **PrototypeRegistry** (optional): Stores named prototypes; clients fetch and clone by name.

## Constraints
- `clone()` must produce an independent copy — mutating the clone must NOT affect the original.
- Deep vs. shallow copy must be a deliberate, documented choice; nested mutable objects usually require deep copy.
- The prototype must be fully initialized before being registered or handed to the client.
- Client must NOT reference the concrete type of the prototype — only the Prototype interface.

## Anti-Patterns
- Returning a shallow copy when the object graph contains mutable shared references (silent aliasing bugs).
- Cloning objects that hold non-copyable resources (open file handles, active DB connections) without resetting those fields.
- Using `clone()` as a workaround for missing constructors — prefer a Builder when configuration complexity is the real problem.
- Storing the prototype registry as a mutable global singleton accessible from everywhere.

## Generic Example Structure
```
interface Prototype {
  clone(): Prototype
}

ConcreteShape implements Prototype {
  x, y: int
  color: string
  clone(): ConcreteShape {
    return ConcreteShape{ x: self.x, y: self.y, color: self.color }
  }
}

Registry {
  prototypes: map[string]Prototype
  register(name, p): void
  get(name): Prototype { return prototypes[name].clone() }
}
```

## Go

### Notes
- Go has no built-in `Cloneable`; define a `Clone() *T` method on each type.
- For structs with only value fields, a simple struct copy (`*copy := *original`) is a safe shallow clone.
- Slices and maps need explicit copying (`copy(dst, src)` and iterating) to avoid shared backing arrays.
- Embed `sync.Mutex` fields should be zero-valued in the clone, not copied.

### Example Structure
```go
type Shape interface{ Clone() Shape }

type Circle struct {
    X, Y   int
    Radius float64
    Tags   []string
}

func (c *Circle) Clone() Shape {
    tags := make([]string, len(c.Tags))
    copy(tags, c.Tags)
    return &Circle{X: c.X, Y: c.Y, Radius: c.Radius, Tags: tags}
}

type Registry struct{ store map[string]Shape }

func (r *Registry) Get(name string) Shape { return r.store[name].Clone() }
```

## Java

### Notes
- Implement `java.lang.Cloneable` and override `clone()` with a covariant return type.
- `super.clone()` performs a shallow copy; manually deep-copy mutable fields afterward.
- Copy constructors (`new MyClass(other)`) are often clearer and safer than `Cloneable`.
- For complex object graphs, serialization-based cloning (serialize then deserialize) provides a reliable deep copy.

### Example Structure
```java
public class Circle implements Cloneable {
    private int x, y;
    private List<String> tags;

    @Override
    public Circle clone() {
        try {
            Circle copy = (Circle) super.clone(); // shallow
            copy.tags = new ArrayList<>(this.tags); // deep-copy mutable field
            return copy;
        } catch (CloneNotSupportedException e) { throw new AssertionError(); }
    }
}
```

## Python

### Notes
- `copy.copy()` for shallow clone; `copy.deepcopy()` for deep clone — both respect `__copy__` and `__deepcopy__` overrides.
- Override `__copy__` to customize shallow copy behavior (e.g., reset transient fields).
- `@dataclass` instances support `dataclasses.replace(obj, **overrides)` for creating modified copies.
- Use `deepcopy` carefully on objects with cycles or non-serializable resources; override `__deepcopy__` to handle them.

### Example Structure
```python
import copy
from dataclasses import dataclass, field

@dataclass
class Circle:
    x: int
    y: int
    radius: float
    tags: list[str] = field(default_factory=list)

    def clone(self) -> "Circle":
        return copy.deepcopy(self)

# Registry
class ShapeRegistry:
    def __init__(self) -> None:
        self._store: dict[str, Circle] = {}

    def register(self, name: str, shape: Circle) -> None:
        self._store[name] = shape

    def get(self, name: str) -> Circle:
        return self._store[name].clone()
```

## Rust

### Notes
- Derive `Clone` (and `Copy` for small, fully value-typed structs) for automatic implementation.
- `Clone` performs a deep clone when all fields implement `Clone`.
- For types with non-cloneable fields (e.g., `File`), implement `Clone` manually and reset those fields.
- `Arc::clone` is a cheap reference-count increment, not a deep copy — be explicit about which you need.

### Example Structure
```rust
#[derive(Clone)]
struct Circle {
    x: i32,
    y: i32,
    radius: f64,
    tags: Vec<String>, // Vec<String>::clone is a deep copy
}

struct Registry {
    store: std::collections::HashMap<String, Circle>,
}

impl Registry {
    fn get(&self, name: &str) -> Option<Circle> {
        self.store.get(name).cloned()
    }
}
```
