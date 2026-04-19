---
name: Observer
category: behavioral
aliases: [Event, Listener]
languages: [go, java, python, rust, typescript, generic]
triggers:
  - notify multiple subscribers on state change
  - event-driven notification
  - decouple event producer from consumers
  - propagate changes across objects
---

## Overview
Defines a one-to-many dependency between objects so that when one object (Subject) changes state, all its dependents (Observers) are notified and updated automatically. Decouples producers from consumers.

## Components
- **Subject** (Observable): Maintains a list of Observers; notifies them on state change. Provides subscribe/unsubscribe methods.
- **ConcreteSubject**: Holds the actual state; calls `notify()` when state changes.
- **Observer** (interface): Declares the `update(event)` method called by the Subject.
- **ConcreteObserver**: Reacts to notifications from the Subject; may query Subject for details.

## Constraints
- Subject must NOT know the concrete Observer types — it holds a list of the Observer interface only.
- `notify()` must NOT be called while Subject's state is in a partially inconsistent state.
- Observers must NOT modify the Subject's state during `update()` — this can cause infinite notification loops.
- Unsubscribe must work correctly; stale observers must not receive notifications after removal.

## Anti-Patterns
- Subject holding strong references to observers indefinitely (memory leaks in long-lived subjects).
- Notification order dependency — observers must not assume they are notified in a specific order.
- Passing the entire Subject object in the event when only a small delta is needed (push the minimal event data).
- Triggering cascading notifications without a guard (Observer A notifies B which notifies A — infinite loop).

## Generic Example Structure
```
interface Observer {
  update(event: Event): void
}

Subject {
  observers: []Observer
  subscribe(o: Observer): void   { observers.append(o) }
  unsubscribe(o: Observer): void { observers.remove(o) }
  notify(event: Event): void {
    for o in observers { o.update(event) }
  }
}

ConcreteSubject extends Subject {
  state: State
  setState(s: State): void {
    state = s
    notify(StateChangedEvent{newState: s})
  }
}
```

## Go

### Notes
- Use a slice of `Observer` interface values for the subscriber list; protect with `sync.RWMutex` in concurrent code.
- Channels are the idiomatic Go alternative: Subject sends events to subscriber channels; Observers read from their channel.
- Return a cancel/unsubscribe function from `Subscribe()` — cleaner than a separate `Unsubscribe()` method.
- `sync.Map` or a `map[ObserverID]Observer` makes removal O(1) without slice scanning.

### Example Structure
```go
type Event struct{ State string }
type Observer interface{ Update(e Event) }

type Subject struct {
    mu        sync.RWMutex
    observers []Observer
}

func (s *Subject) Subscribe(o Observer) {
    s.mu.Lock(); defer s.mu.Unlock()
    s.observers = append(s.observers, o)
}

func (s *Subject) Notify(e Event) {
    s.mu.RLock(); defer s.mu.RUnlock()
    for _, o := range s.observers { o.Update(e) }
}

type Logger struct{}
func (Logger) Update(e Event) { log.Println("state:", e.State) }
```

## Java

### Notes
- `java.util.Observable` is deprecated since Java 9; use custom interfaces instead.
- `java.beans.PropertyChangeListener` is a built-in Observer for JavaBeans property changes.
- Spring's `ApplicationEventPublisher` and `@EventListener` implement Observer at the framework level.
- Use `CopyOnWriteArrayList` for the observer list when notifications happen on a different thread from subscribe/unsubscribe.

### Example Structure
```java
interface Observer { void update(String event); }

class EventBus {
    private final List<Observer> observers = new CopyOnWriteArrayList<>();
    public void subscribe(Observer o)   { observers.add(o); }
    public void unsubscribe(Observer o) { observers.remove(o); }
    public void notify(String event)    { observers.forEach(o -> o.update(event)); }
}

class StockTicker {
    private final EventBus bus;
    private double price;
    StockTicker(EventBus bus) { this.bus = bus; }
    void setPrice(double price) {
        this.price = price;
        bus.notify("price:" + price);
    }
}
```

## Python

### Notes
- Use a `list[Observer]` for the subscriber registry; `weakref.WeakSet` prevents memory leaks for short-lived observers.
- Python's `property` setter is a natural place to trigger notifications on state change.
- `asyncio` coroutines and queues implement event-driven notification for async contexts.
- `blinker` and `PyDispatcher` are popular third-party observer/signal libraries for Python.

### Example Structure
```python
from __future__ import annotations
from typing import Protocol, Callable

class Observer(Protocol):
    def update(self, event: str) -> None: ...

class Subject:
    def __init__(self) -> None:
        self._observers: list[Observer] = []
        self._state = ""

    def subscribe(self, o: Observer) -> None: self._observers.append(o)
    def unsubscribe(self, o: Observer) -> None: self._observers.remove(o)

    def _notify(self, event: str) -> None:
        for o in list(self._observers): o.update(event)

    @property
    def state(self) -> str: return self._state

    @state.setter
    def state(self, value: str) -> None:
        self._state = value
        self._notify(f"state:{value}")
```

## Rust

### Notes
- Use `Vec<Box<dyn Observer>>` for owned observers; `Vec<Weak<dyn Observer>>` for non-owning references.
- Closures (`Vec<Box<dyn Fn(&Event)>>`) are lightweight observers when no per-observer state is needed.
- `tokio::broadcast` channel implements multi-consumer pub-sub for async contexts.
- Avoid shared mutable observer lists across threads without `Mutex` or `RwLock` protection.

### Example Structure
```rust
trait Observer { fn update(&self, event: &str); }

struct Subject { observers: Vec<Box<dyn Observer>> }
impl Subject {
    fn subscribe(&mut self, o: Box<dyn Observer>) { self.observers.push(o); }
    fn notify(&self, event: &str) {
        for o in &self.observers { o.update(event); }
    }
}

struct ConcreteSubject { inner: Subject, state: String }
impl ConcreteSubject {
    fn set_state(&mut self, s: &str) {
        self.state = s.into();
        self.inner.notify(&format!("state:{s}"));
    }
}
```

## TypeScript

### Notes
- Node.js `EventEmitter` is the standard Observer for server-side TypeScript — `on`, `emit`, `off` built in.
- For typed, composable reactive streams: RxJS `Subject<T>` and `Observable<T>` are idiomatic in Angular and complex event pipelines.
- Strongly type events with `eventemitter3`: `new EventEmitter<{ 'price:changed': [number] }>()` eliminates stringly-typed names.
- Clean up with `emitter.off(event, handler)` in teardown (`useEffect` cleanup, `ngOnDestroy`) to prevent memory leaks.

### Example Structure
```typescript
import { EventEmitter } from 'events';

class StockTicker extends EventEmitter {
  private price = 0;

  setPrice(price: number): void {
    this.price = price;
    this.emit('price:changed', price);
  }
  getPrice(): number { return this.price; }
}

// Observers attach at runtime
const ticker = new StockTicker();
const alertHandler = (price: number) => {
  if (price > 500) console.warn(`High price: ${price}`);
};
ticker.on('price:changed', alertHandler);
ticker.on('price:changed', (p) => console.log(`Current price: ${p}`));

ticker.setPrice(600); // both handlers fire
ticker.off('price:changed', alertHandler); // unsubscribe
```
