---
name: Iterator
category: behavioral
languages: [go, java, python, rust, typescript, generic]
triggers:
  - traverse collection without exposing structure
  - multiple simultaneous traversals
  - uniform iteration interface across different collections
---

## Overview
Provides a way to sequentially access elements of a collection without exposing its underlying structure. Decouples the traversal algorithm from the collection, enabling multiple independent traversals.

## Components
- **Iterator** (interface): Declares `hasNext()` and `next()` (or equivalent) for traversal.
- **ConcreteIterator**: Implements Iterator for a specific collection; tracks current position.
- **IterableCollection** (interface): Declares a factory method `createIterator()` that returns an Iterator.
- **ConcreteCollection**: Implements IterableCollection; returns a ConcreteIterator over its elements.

## Constraints
- Iterator must NOT modify the collection during traversal — modifications invalidate the iteration state.
- Each `createIterator()` call must return a fresh, independent iterator instance (not a shared singleton).
- Iterator must signal completion clearly (return false from `hasNext()` or raise StopIteration) — never silently wrap around.
- Iterator state (current position) must be stored in the Iterator object, not in the Collection.

## Anti-Patterns
- Exposing the collection's internal index or pointer directly to allow caller-managed traversal.
- Modifying the collection while iterating without a defined concurrent modification strategy.
- Sharing a single iterator instance across multiple consumers (they will interfere).
- Resetting and reusing an iterator — create a new one via `createIterator()` for each traversal pass.

## Generic Example Structure
```
interface Iterator<T> {
  hasNext(): bool
  next(): T
}

interface Collection<T> {
  createIterator(): Iterator<T>
}

ConcreteIterator<T> implements Iterator<T> {
  items: []T
  index: int = 0
  hasNext(): bool { return index < len(items) }
  next(): T { v := items[index]; index++; return v }
}

ConcreteCollection<T> implements Collection<T> {
  items: []T
  createIterator(): Iterator<T> { return ConcreteIterator{items: items} }
}
```

## Go

### Notes
- Go's `for range` loop is built-in iteration; custom iterators are needed only for lazy or non-slice collections.
- Model iterators as structs with a `Next() (T, bool)` method returning the value and a "has more" boolean.
- Go 1.23+ `iter.Seq[T]` and `range` over functions provide first-class iterator support.
- Channels can act as iterators for concurrent producers, but prefer `iter.Seq` for synchronous iteration.

### Example Structure
```go
type Iterator[T any] interface {
    HasNext() bool
    Next() T
}

type SliceIterator[T any] struct {
    items []T
    index int
}

func (it *SliceIterator[T]) HasNext() bool { return it.index < len(it.items) }
func (it *SliceIterator[T]) Next() T {
    v := it.items[it.index]
    it.index++
    return v
}

func NewIterator[T any](items []T) Iterator[T] { return &SliceIterator[T]{items: items} }
```

## Java

### Notes
- `java.util.Iterator<E>` is the standard interface; implement it for custom collections.
- `Iterable<E>` (with `iterator()` factory method) enables `for-each` loop support.
- `ListIterator` additionally supports `hasPrevious()` and `previous()` for bidirectional traversal.
- `ConcurrentModificationException` is thrown when a collection is modified during iteration — document this constraint.

### Example Structure
```java
class NumberRange implements Iterable<Integer> {
    private final int start, end;
    NumberRange(int start, int end) { this.start = start; this.end = end; }

    @Override
    public Iterator<Integer> iterator() {
        return new Iterator<>() {
            int current = start;
            public boolean hasNext() { return current <= end; }
            public Integer next() { return current++; }
        };
    }
}
// Usage: for (int n : new NumberRange(1, 10)) { ... }
```

## Python

### Notes
- Implement `__iter__()` (returns self or a new iterator) and `__next__()` (raises `StopIteration` when done).
- Generator functions (`yield`) create iterators with minimal boilerplate.
- `itertools` provides composable iterator utilities (chain, islice, groupby).
- `collections.abc.Iterator` is the abstract base; subclassing it enforces the protocol.

### Example Structure
```python
from typing import Iterator as IteratorType

class NumberRange:
    def __init__(self, start: int, end: int) -> None:
        self._start = start
        self._end = end

    def __iter__(self) -> IteratorType[int]:
        return _NumberIterator(self._start, self._end)

class _NumberIterator:
    def __init__(self, start: int, end: int) -> None:
        self._current = start
        self._end = end

    def __iter__(self) -> "_NumberIterator": return self

    def __next__(self) -> int:
        if self._current > self._end:
            raise StopIteration
        value = self._current
        self._current += 1
        return value
```

## Rust

### Notes
- Implement the `Iterator` trait (required: `type Item` and `fn next(&mut self) -> Option<Self::Item>`).
- Once `Iterator` is implemented, all `std::iter` adapters (map, filter, take, collect) work for free.
- Prefer implementing `IntoIterator` on the collection so `for x in collection` works directly.
- Lifetimes are needed when the iterator yields references into the collection (`Item = &'a T`).

### Example Structure
```rust
struct NumberRange { current: i32, end: i32 }

impl NumberRange {
    fn new(start: i32, end: i32) -> Self { Self { current: start, end } }
}

impl Iterator for NumberRange {
    type Item = i32;
    fn next(&mut self) -> Option<i32> {
        if self.current <= self.end {
            let v = self.current;
            self.current += 1;
            Some(v)
        } else { None }
    }
}
// Usage: for n in NumberRange::new(1, 10) { ... }
```

## TypeScript

### Notes
- Implement `Symbol.iterator` and the `Iterable<T>` / `Iterator<T>` interfaces — built into the language; `for...of`, spread, and destructuring all consume them.
- Generator functions (`function* gen(): Generator<T>`) are the idiomatic factory for custom iterators.
- Async iterators (`AsyncIterable<T>`) and `for await...of` for streaming or paginated data sources.
- TypeScript's `IterableIterator<T>` combines both interfaces — generators implement it by default.

### Example Structure
```typescript
class NumberRange implements Iterable<number> {
  constructor(private start: number, private end: number) {}

  [Symbol.iterator](): Iterator<number> {
    let current = this.start;
    const end = this.end;
    return {
      next(): IteratorResult<number> {
        return current < end
          ? { value: current++, done: false }
          : { value: 0,         done: true  };
      },
    };
  }
}

// Generator-based (more idiomatic)
function* range(start: number, end: number): Generator<number> {
  for (let i = start; i < end; i++) yield i;
}

for (const n of new NumberRange(1, 4)) console.log(n); // 1, 2, 3
console.log([...range(1, 4)]);                          // [1, 2, 3]
```
