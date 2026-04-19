---
name: Mediator
category: behavioral
languages: [go, java, python, rust, typescript, generic]
triggers:
  - many objects communicate in complex ways
  - reduce direct references between objects
  - centralize communication
  - UI component coordination
---

## Overview
Defines an object that encapsulates how a set of objects interact. Promotes loose coupling by keeping objects from referring to each other explicitly and centralizing communication through the mediator.

## Components
- **Mediator** (interface): Declares the notification method that components call to communicate.
- **ConcreteMediator**: Knows all component objects; implements the coordination logic.
- **Component**: Each participant. Holds a reference to the Mediator; calls it instead of other components.
- **ConcreteComponent**: Implements specific behavior; notifies Mediator on state changes.

## Constraints
- Components must NOT hold direct references to each other — all interaction goes through the Mediator.
- Mediator must NOT contain business logic; it only coordinates message routing between components.
- Each Component must know only the Mediator interface, not the ConcreteMediator type.
- Avoid growing the Mediator into a God-Object; split into multiple focused mediators if it exceeds ~7 component types.

## Anti-Patterns
- Components calling each other directly (the problem Mediator solves).
- Putting domain logic in the Mediator instead of in the components (makes Mediator a service disguised as a router).
- Using a single global Mediator for the entire application (every change couples everything).
- Passing the full component object in notifications when only an event type and minimal data suffice.

## Generic Example Structure
```
interface Mediator {
  notify(sender: Component, event: string): void
}

ConcreteMediator implements Mediator {
  componentA: ComponentA
  componentB: ComponentB

  notify(sender, event): void {
    if event == "aChanged" { componentB.reactToA() }
    if event == "bChanged" { componentA.reactToB() }
  }
}

Component {
  mediator: Mediator
  changed(event: string): void { mediator.notify(self, event) }
}
```

## Go

### Notes
- Define `Mediator` as an interface; components hold `mediator Mediator` and call it on state change.
- Use a simple event string or typed event struct to identify the notification in `Notify()`.
- Channels can play the role of a mediator in concurrent systems (goroutines communicate via channels, not direct references).
- Dependency injection: the ConcreteMediator is constructed with references to all its components.

### Example Structure
```go
type Mediator interface{ Notify(sender any, event string) }

type Button struct {
    mediator Mediator
    Label    string
}
func (b *Button) Click() { b.mediator.Notify(b, "click") }

type TextBox struct {
    mediator Mediator
    Text     string
}
func (t *TextBox) Change(text string) { t.Text = text; t.mediator.Notify(t, "change") }

type FormMediator struct{ btn *Button; txt *TextBox }
func (m *FormMediator) Notify(sender any, event string) {
    if event == "change" { m.btn.Label = "Save (" + m.txt.Text + ")" }
}
```

## Java

### Notes
- Use an interface for Mediator; the ConcreteMediator holds references to components injected via constructor.
- Event objects (`ComponentEvent { sender, type, data }`) are cleaner than raw strings for large systems.
- Spring's `ApplicationEventPublisher` / `ApplicationListener` is a framework-level Mediator implementation.
- UI frameworks (JavaFX bindings, Swing listeners) implicitly implement Mediator patterns.

### Example Structure
```java
interface Mediator { void notify(Object sender, String event); }

class Button {
    private Mediator mediator;
    String label;
    Button(Mediator m) { this.mediator = m; }
    void click() { mediator.notify(this, "click"); }
}

class TextBox {
    private Mediator mediator;
    String text;
    TextBox(Mediator m) { this.mediator = m; }
    void change(String text) { this.text = text; mediator.notify(this, "change"); }
}

class FormMediator implements Mediator {
    Button btn; TextBox txt;
    public void notify(Object sender, String event) {
        if ("change".equals(event)) btn.label = "Save (" + txt.text + ")";
    }
}
```

## Python

### Notes
- The Mediator can be a simple callable that dispatches on event type — no need for a full class in simple cases.
- Use `typing.Protocol` for the Mediator interface to allow structural subtyping.
- `weakref.WeakSet` for component references prevents memory leaks when components are garbage collected.
- Python's `tkinter` variable tracing and Qt signals are Mediator implementations.

### Example Structure
```python
from __future__ import annotations
from abc import ABC, abstractmethod

class Mediator(ABC):
    @abstractmethod
    def notify(self, sender: object, event: str) -> None: ...

class Button:
    def __init__(self, mediator: Mediator) -> None:
        self._mediator = mediator
        self.label = ""

    def click(self) -> None:
        self._mediator.notify(self, "click")

class FormMediator(Mediator):
    def __init__(self) -> None:
        self.button = Button(self)
        self.textbox: "TextBox | None" = None

    def notify(self, sender: object, event: str) -> None:
        if event == "change" and self.textbox:
            self.button.label = f"Save ({self.textbox.text})"
```

## Rust

### Notes
- Use `Rc<RefCell<Mediator>>` for shared mutable access from multiple components, or channels for message passing.
- Channels (`mpsc::Sender`) are the idiomatic Rust mediator — components send events to a channel, the mediator receives and routes.
- `Box<dyn Mediator>` enables runtime polymorphism when multiple mediator implementations are needed.
- Avoid `Arc<Mutex<>>` wrapping the mediator if all components run on the same thread; `Rc<RefCell<>>` suffices.

### Example Structure
```rust
use std::sync::mpsc::{channel, Sender};

#[derive(Debug)]
enum Event { Click, Change(String) }

struct Button { tx: Sender<Event> }
impl Button { fn click(&self) { let _ = self.tx.send(Event::Click); } }

struct TextBox { tx: Sender<Event> }
impl TextBox { fn change(&self, text: &str) { let _ = self.tx.send(Event::Change(text.into())); } }

fn run_mediator() {
    let (tx, rx) = channel::<Event>();
    let btn = Button { tx: tx.clone() };
    let _txt = TextBox { tx };
    std::thread::spawn(move || {
        while let Ok(event) = rx.recv() { /* route event */ let _ = &btn; }
    });
}
```

## TypeScript

### Notes
- Node.js `EventEmitter` is a natural Mediator for event-based communication between server-side components.
- For typed events, use `eventemitter3` with a `type Events = { 'user:created': [User] }` type parameter to eliminate stringly-typed event names.
- React Context API is the idiomatic mediator for UI component communication without prop drilling.
- NestJS `EventEmitter2` with `@OnEvent('order.placed')` decorators is the idiomatic mediator for NestJS services.

### Example Structure
```typescript
import EventEmitter from 'eventemitter3';

type AppEvents = {
  'order:placed':   [orderId: string, amount: number];
  'payment:failed': [orderId: string, reason: string];
};

const bus = new EventEmitter<AppEvents>();

// Publisher
bus.emit('order:placed', 'order-123', 99.99);

// Subscribers (each component registers independently)
bus.on('order:placed', (orderId, amount) => {
  console.log(`New order ${orderId} for $${amount}`);
});

bus.on('order:placed', (orderId) => {
  inventoryService.reserve(orderId);
});
```
