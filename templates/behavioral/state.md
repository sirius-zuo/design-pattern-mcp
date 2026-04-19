---
name: State
category: behavioral
languages: [go, java, python, rust, typescript, generic]
triggers:
  - object behavior changes based on internal state
  - state machine with multiple transitions
  - eliminate large if/switch on state enum
  - model workflow stages
---

## Overview
Allows an object to alter its behavior when its internal state changes. The object appears to change its class. Encapsulates state-specific behavior in separate State objects, eliminating large conditional blocks.

## Components
- **Context**: Holds a reference to the current State object. Delegates state-dependent requests to it. Exposes a method to transition states.
- **State** (interface): Declares all state-specific operations that every concrete state must implement.
- **ConcreteState**: Implements the behavior for one state. May trigger transitions by calling `context.transitionTo(nextState)`.

## Constraints
- Context must NOT contain state-specific logic — all of that lives in ConcreteState.
- State transitions must be explicit: either the ConcreteState triggers them or the Context triggers them based on State return values — not both.
- ConcreteState must NOT hold business data — only the logic for one state's behavior.
- The set of valid transitions must be documented; invalid transitions should return an error or be no-ops, not silently succeed.

## Anti-Patterns
- Keeping a large `switch(state)` block in Context (the problem State pattern solves).
- States that reach into Context to modify its private data directly (violates encapsulation).
- A single ConcreteState class handling multiple distinct states (defeats the purpose of separation).
- States creating their successor states by instantiating concrete types directly (use a factory or pass state objects in).

## Generic Example Structure
```
interface State {
  handle(ctx: Context): void
}

Context {
  state: State
  transitionTo(s: State): void { state = s }
  request(): void { state.handle(self) }
}

IdleState implements State {
  handle(ctx): void {
    // idle behavior
    ctx.transitionTo(ProcessingState{})
  }
}

ProcessingState implements State {
  handle(ctx): void {
    // process
    ctx.transitionTo(DoneState{})
  }
}
```

## Go

### Notes
- Define State as a Go interface; ConcreteState structs implement it and receive a `*Context` to trigger transitions.
- Use an unexported `setState()` method on Context so only State implementations can trigger transitions.
- Represent each state as a zero-size struct when it carries no per-state data.
- For complex FSMs with many states, consider a transition table (`map[StateID]map[Event]StateID`).

### Example Structure
```go
type State interface{ Handle(ctx *Context) }

type Context struct{ state State }
func (c *Context) SetState(s State) { c.state = s }
func (c *Context) Request()         { c.state.Handle(c) }

type IdleState struct{}
func (s IdleState) Handle(ctx *Context) {
    fmt.Println("Idle: starting work")
    ctx.SetState(ProcessingState{})
}

type ProcessingState struct{}
func (s ProcessingState) Handle(ctx *Context) {
    fmt.Println("Processing: done")
    ctx.SetState(IdleState{})
}
```

## Java

### Notes
- Use an interface for State; abstract class is appropriate when states share common helper methods.
- Pass the Context to each `handle()` call so states can trigger transitions.
- `enum` with abstract methods is a compact representation for fixed, finite state machines.
- Spring State Machine provides a framework-level implementation for complex FSMs.

### Example Structure
```java
interface State { void handle(Context ctx); }

class Context {
    private State state;
    Context(State initial) { this.state = initial; }
    void setState(State s) { this.state = s; }
    void request() { state.handle(this); }
}

class IdleState implements State {
    public void handle(Context ctx) {
        System.out.println("Idle -> Processing");
        ctx.setState(new ProcessingState());
    }
}

class ProcessingState implements State {
    public void handle(Context ctx) {
        System.out.println("Processing -> Idle");
        ctx.setState(new IdleState());
    }
}
```

## Python

### Notes
- Python's dynamic dispatch makes state transitions easy: assign a new state object to `self._state`.
- Use `abc.ABC` with `@abstractmethod` to enforce that all states implement required operations.
- `__class__` reassignment is a Pythonic trick but hurts readability; prefer explicit state-object composition.
- For simple FSMs, a `dict[str, Callable]` transition table is often clearer than a full class hierarchy.

### Example Structure
```python
from abc import ABC, abstractmethod

class State(ABC):
    @abstractmethod
    def handle(self, context: "Context") -> None: ...

class Context:
    def __init__(self, state: State) -> None:
        self._state = state

    def transition_to(self, state: State) -> None:
        self._state = state

    def request(self) -> None:
        self._state.handle(self)

class IdleState(State):
    def handle(self, context: Context) -> None:
        print("Idle -> Processing")
        context.transition_to(ProcessingState())

class ProcessingState(State):
    def handle(self, context: Context) -> None:
        print("Processing -> Idle")
        context.transition_to(IdleState())
```

## Rust

### Notes
- The typestate pattern encodes state in the type system, making illegal transitions compile-time errors.
- For runtime state machines, use an enum with per-variant data and `match` for dispatch.
- `Box<dyn State>` enables dynamic dispatch when the number of states is large or open.
- Combine with the Builder pattern to construct state machines with validated initial states.

### Example Structure
```rust
trait State { fn handle(self: Box<Self>, ctx: &mut Context) -> Box<dyn State>; }

struct Context { state: Option<Box<dyn State>> }
impl Context {
    fn request(&mut self) {
        if let Some(s) = self.state.take() {
            self.state = Some(s.handle(self));
        }
    }
}

struct IdleState;
impl State for IdleState {
    fn handle(self: Box<Self>, _ctx: &mut Context) -> Box<dyn State> {
        println!("Idle -> Processing");
        Box::new(ProcessingState)
    }
}

struct ProcessingState;
impl State for ProcessingState {
    fn handle(self: Box<Self>, _ctx: &mut Context) -> Box<dyn State> {
        println!("Processing -> Idle");
        Box::new(IdleState)
    }
}
```

## TypeScript

### Notes
- Prefer discriminated unions (`type State = 'idle' | 'loading' | 'success' | 'error'`) over class hierarchies for simple, finite state machines.
- Complex state machines with guards, parallel states, or history: use the `xstate` library.
- TypeScript `switch` exhaustiveness (`default: state satisfies never`) ensures every state is handled at compile time.
- For class-based state, structural typing means concrete state classes don't need to `extend` a base — just satisfy the `StateHandler` interface.

### Example Structure
```typescript
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface StateHandler {
  connect(ctx: Connection): void;
  disconnect(ctx: Connection): void;
}

const stateHandlers: Record<ConnectionState, StateHandler> = {
  disconnected: { connect: ctx => ctx.transition('connecting'), disconnect: () => {} },
  connecting:   { connect: () => {},                           disconnect: ctx => ctx.transition('disconnected') },
  connected:    { connect: () => {},                           disconnect: ctx => ctx.transition('disconnected') },
  error:        { connect: ctx => ctx.transition('connecting'), disconnect: ctx => ctx.transition('disconnected') },
};

class Connection {
  private state: ConnectionState = 'disconnected';
  transition(s: ConnectionState): void { this.state = s; }
  connect():    void { stateHandlers[this.state].connect(this); }
  disconnect(): void { stateHandlers[this.state].disconnect(this); }
}
```
