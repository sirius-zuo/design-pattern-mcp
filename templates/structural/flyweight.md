---
name: Flyweight
category: structural
languages: [go, java, python, rust, generic]
triggers:
  - large number of fine-grained similar objects
  - memory pressure from object count
  - shared intrinsic state across many instances
  - optimize for memory
---

## Overview
Reduces memory usage by sharing common state (intrinsic) among many fine-grained objects. Each flyweight stores only the shared immutable state; unique state (extrinsic) is passed in by the caller at runtime.

## Components
- **Flyweight**: The shared object. Stores only intrinsic (shared, immutable) state. Must be immutable after creation.
- **ConcreteFlyweight**: Implements Flyweight for a specific combination of intrinsic state.
- **FlyweightFactory**: Creates and caches flyweights. Returns an existing instance when the requested intrinsic state matches a cached one.
- **Context** (caller): Stores the extrinsic (unique, mutable) state and passes it to the flyweight when calling its operations.

## Constraints
- Flyweight objects must be immutable — shared state must NEVER be modified by any context.
- All mutable, unique state must be stored externally in the Context, not in the Flyweight.
- FlyweightFactory must be the only way to obtain flyweights — direct instantiation bypasses the cache.
- Measure memory savings before applying Flyweight; the added complexity is only justified for large numbers of objects.

## Anti-Patterns
- Storing any mutable or context-specific state inside the Flyweight (breaks sharing correctness).
- Bypassing the FlyweightFactory to create flyweights directly (no sharing, no memory savings).
- Applying Flyweight to objects that are not actually duplicated in large numbers.
- Using Flyweight when the extrinsic state lookup overhead eliminates the memory gain.

## Generic Example Structure
```
Flyweight(intrinsic: State) {
  // immutable shared state
  operation(extrinsic: Context): void {
    // use intrinsic + extrinsic
  }
}

FlyweightFactory {
  cache: map[State]Flyweight
  get(state: State): Flyweight {
    if not in cache { cache[state] = Flyweight(state) }
    return cache[state]
  }
}

// Caller passes extrinsic state at call time
fw := factory.get(State{color:"red"})
fw.operation(Context{x:10, y:20})
```

## Go

### Notes
- Use `sync.Map` or a `map` protected by `sync.RWMutex` in FlyweightFactory for concurrent access.
- Flyweight structs must have no pointer fields holding mutable data; all fields should be value types or immutable references.
- A common Go example: glyph objects in a text editor where font/size are shared but position is extrinsic.
- Benchmark with `testing.B` before applying — maps have overhead; the gain must justify the complexity.

### Example Structure
```go
type GlyphState struct{ Font, Color string }

type Glyph struct{ state GlyphState } // intrinsic only

func (g *Glyph) Draw(x, y int) { /* use g.state + extrinsic x,y */ }

type GlyphFactory struct {
    mu    sync.Mutex
    cache map[GlyphState]*Glyph
}

func (f *GlyphFactory) Get(s GlyphState) *Glyph {
    f.mu.Lock(); defer f.mu.Unlock()
    if g, ok := f.cache[s]; ok { return g }
    g := &Glyph{state: s}
    f.cache[s] = g
    return g
}
```

## Java

### Notes
- Use `ConcurrentHashMap` in FlyweightFactory for thread-safe caching.
- `computeIfAbsent` idiom: `cache.computeIfAbsent(key, k -> new Flyweight(k))`.
- Java's `String.intern()` and `Integer.valueOf()` caching are built-in Flyweight examples.
- Mark the Flyweight class `final` and all fields `final` to enforce immutability.

### Example Structure
```java
final class Glyph {
    private final String font;
    private final String color;
    Glyph(String font, String color) { this.font = font; this.color = color; }
    void draw(int x, int y) { /* intrinsic + extrinsic */ }
}

class GlyphFactory {
    private final Map<String, Glyph> cache = new ConcurrentHashMap<>();
    public Glyph get(String font, String color) {
        String key = font + ":" + color;
        return cache.computeIfAbsent(key, k -> new Glyph(font, color));
    }
}
```

## Python

### Notes
- Use `functools.lru_cache` or `@cache` on a factory function for simple flyweight caching.
- `__slots__` on the Flyweight class reduces per-instance memory overhead.
- Python's small integer cache and string interning are built-in Flyweight examples.
- `weakref.WeakValueDictionary` allows the cache to release flyweights that are no longer referenced.

### Example Structure
```python
import functools
from dataclasses import dataclass

@dataclass(frozen=True)
class GlyphState:
    font: str
    color: str

class Glyph:
    __slots__ = ("state",)
    def __init__(self, state: GlyphState) -> None:
        self.state = state
    def draw(self, x: int, y: int) -> None:
        pass  # use self.state + extrinsic x, y

@functools.lru_cache(maxsize=None)
def get_glyph(font: str, color: str) -> Glyph:
    return Glyph(GlyphState(font, color))
```

## Rust

### Notes
- Use `Arc<T>` to share immutable flyweights across multiple owners without copying.
- `HashMap<Key, Arc<Flyweight>>` in a factory provides reference-counted sharing.
- `Arc` clone is cheap (atomic increment); suitable for high-concurrency scenarios.
- Ensure flyweight types implement `Send + Sync` so they can be shared across threads safely.

### Example Structure
```rust
use std::{collections::HashMap, sync::Arc};

#[derive(Hash, Eq, PartialEq, Clone)]
struct GlyphState { font: String, color: String }

struct Glyph { state: GlyphState }
impl Glyph {
    fn draw(&self, x: i32, y: i32) { /* intrinsic + extrinsic */ }
}

struct GlyphFactory { cache: HashMap<GlyphState, Arc<Glyph>> }
impl GlyphFactory {
    fn get(&mut self, font: &str, color: &str) -> Arc<Glyph> {
        let key = GlyphState { font: font.into(), color: color.into() };
        self.cache.entry(key.clone())
            .or_insert_with(|| Arc::new(Glyph { state: key }))
            .clone()
    }
}
```
