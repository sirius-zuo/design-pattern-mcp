---
name: Decorator
category: structural
aliases: [Wrapper]
languages: [go, java, python, rust, generic]
triggers:
  - add responsibilities dynamically without subclassing
  - middleware chain
  - cross-cutting concerns like logging or caching
  - extend behavior at runtime
---

## Overview
Attaches additional responsibilities to an object dynamically by wrapping it in decorator objects that share the same interface. Provides a flexible alternative to subclassing for extending functionality.

## Components
- **Component** (interface): The common interface for both the concrete component and all decorators.
- **ConcreteComponent**: The base object being decorated; implements the core behavior.
- **Decorator** (base): Wraps a Component reference and delegates to it. Implements the Component interface.
- **ConcreteDecorator**: Extends Decorator by adding behavior before or after the delegation call.

## Constraints
- Decorator must implement the same interface as the Component it wraps — the client must not distinguish them.
- Decorator must delegate to the wrapped Component; skipping delegation breaks the chain.
- Decorator must NOT modify the wrapped component's internal state — only the inputs/outputs of the delegated call.
- Stacking many decorators creates a deep call chain; limit depth for performance-sensitive paths.

## Anti-Patterns
- Using subclassing to add cross-cutting concerns (causes combinatorial explosion of subclass variants).
- Decorating with side effects that change the wrapped object's observable state (use a Proxy instead).
- Ordering-dependent decorators without documenting or enforcing the required order.
- Skipping delegation in a ConcreteDecorator to completely replace behavior — that is a Proxy, not a Decorator.

## Generic Example Structure
```
interface Component { execute(req: Request): Response }

ConcreteComponent implements Component {
  execute(req): Response { /* core logic */ }
}

Decorator implements Component {
  wrapped: Component
  execute(req): Response { return wrapped.execute(req) }
}

LoggingDecorator extends Decorator {
  execute(req): Response {
    log("before", req)
    res := wrapped.execute(req)
    log("after", res)
    return res
  }
}
```

## Go

### Notes
- Implement Decorator as a struct wrapping the Component interface — no base class needed.
- Middleware chains in `net/http` follow this pattern exactly: `http.Handler` is the Component interface.
- Stack decorators via constructor wrapping: `NewLogging(NewCaching(NewCore()))`.
- Use `io.Reader` / `io.Writer` wrappers (`gzip.NewReader(r)`) as the canonical Go example of this pattern.

### Example Structure
```go
type Handler interface{ Handle(req Request) Response }

type CoreHandler struct{}
func (CoreHandler) Handle(req Request) Response { return Response{} }

type LoggingDecorator struct{ wrapped Handler }
func NewLogging(h Handler) Handler { return &LoggingDecorator{wrapped: h} }
func (d *LoggingDecorator) Handle(req Request) Response {
    log.Printf("→ %v", req)
    res := d.wrapped.Handle(req)
    log.Printf("← %v", res)
    return res
}

// Stack: NewLogging(NewCaching(CoreHandler{}))
```

## Java

### Notes
- The `java.io` stream classes are the canonical Java Decorator example (`BufferedReader(new FileReader(...))`).
- Use constructor injection to wrap components; avoid setters that swap the wrapped component.
- `@FunctionalInterface` + lambdas can create lightweight decorators for single-method interfaces.
- Spring AOP and interceptors implement Decorator semantics automatically for cross-cutting concerns.

### Example Structure
```java
interface DataSource { void writeData(String data); String readData(); }

class FileDataSource implements DataSource {
    public void writeData(String data) { /* write to file */ }
    public String readData() { return "data"; }
}

abstract class DataSourceDecorator implements DataSource {
    protected final DataSource wrapped;
    DataSourceDecorator(DataSource wrapped) { this.wrapped = wrapped; }
    public void writeData(String data) { wrapped.writeData(data); }
    public String readData() { return wrapped.readData(); }
}

class EncryptionDecorator extends DataSourceDecorator {
    EncryptionDecorator(DataSource ds) { super(ds); }
    public void writeData(String data) { super.writeData(encrypt(data)); }
    public String readData() { return decrypt(super.readData()); }
    private String encrypt(String s) { return /* ... */ s; }
    private String decrypt(String s) { return /* ... */ s; }
}
```

## Python

### Notes
- Python's `@decorator` syntax applies function-level decorators; for class-level, wrap in a class.
- `functools.wraps` preserves the wrapped function's metadata when using function decorators.
- Class-based decorators implementing `__call__` work for stateful decorators that need per-instance data.
- `contextlib` provides decorator utilities useful when decorators involve setup/teardown.

### Example Structure
```python
from typing import Protocol
import functools

class DataSource(Protocol):
    def read(self) -> str: ...
    def write(self, data: str) -> None: ...

class FileDataSource:
    def read(self) -> str: return "data"
    def write(self, data: str) -> None: pass

class EncryptionDecorator:
    def __init__(self, wrapped: DataSource) -> None:
        self._wrapped = wrapped

    def read(self) -> str:
        return self._decrypt(self._wrapped.read())

    def write(self, data: str) -> None:
        self._wrapped.write(self._encrypt(data))

    def _encrypt(self, s: str) -> str: return s
    def _decrypt(self, s: str) -> str: return s
```

## Rust

### Notes
- Implement the Component trait for the Decorator struct; hold the inner component as `Box<dyn Component>`.
- Generic decorators (`struct Logging<T: Component> { inner: T }`) give static dispatch with zero overhead.
- Dynamic decorators (`Box<dyn Component>`) allow building chains with different concrete types at runtime.
- Closures wrapping `Box<dyn Fn(Req) -> Res>` are idiomatic for middleware-style decoration.

### Example Structure
```rust
trait Handler { fn handle(&self, req: &str) -> String; }

struct CoreHandler;
impl Handler for CoreHandler {
    fn handle(&self, _req: &str) -> String { "response".into() }
}

struct LoggingDecorator<H: Handler> { inner: H }
impl<H: Handler> Handler for LoggingDecorator<H> {
    fn handle(&self, req: &str) -> String {
        println!("→ {req}");
        let res = self.inner.handle(req);
        println!("← {res}");
        res
    }
}
```
