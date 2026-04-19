---
name: Adapter
category: structural
aliases: [Wrapper]
languages: [go, java, python, rust, typescript, generic]
triggers:
  - incompatible interface from third party
  - legacy component integration
  - normalize multiple external APIs
  - wrap existing class with different interface
---

## Overview
Converts the interface of a class into another interface that clients expect. Allows classes with incompatible interfaces to work together by wrapping the adaptee in a translation layer.

## Components
- **Target** (interface): The interface the client expects to work with.
- **Adaptee**: The existing class with an incompatible interface that needs to be reused.
- **Adapter**: Implements the Target interface and wraps an Adaptee instance; translates Target calls into Adaptee calls.
- **Client**: Works exclusively with the Target interface; unaware of the Adaptee.

## Constraints
- Adapter must implement the Target interface completely — partial adapters that panic on unimplemented methods are fragile.
- Adapter must NOT add business logic; it is a pure translation layer between two interfaces.
- Client must NOT hold a direct reference to the Adaptee — only to the Target interface.
- When multiple Adaptees implement the same concept differently, use one Adapter per Adaptee, not one mega-adapter.

## Anti-Patterns
- Adding business logic inside the Adapter (it becomes a God-Object adapter).
- Bypassing the Adapter and calling the Adaptee directly from client code.
- Using inheritance to adapt when composition would suffice (object adapter > class adapter in most cases).
- Creating a two-way adapter that also adapts Target back to Adaptee — this creates tight bidirectional coupling.

## Generic Example Structure
```
interface Target {
  request(): string
}

Adaptee {
  specificRequest(): string { return "adaptee result" }
}

Adapter implements Target {
  adaptee: Adaptee
  request(): string {
    return translate(adaptee.specificRequest())
  }
}

Client(t: Target) { print(t.request()) }
```

## Go

### Notes
- Use struct embedding when the adapter should expose most of the Adaptee's methods directly, only overriding the incompatible ones.
- Prefer composition (holding an `adaptee` field) over embedding when the translation is extensive.
- Wrap third-party clients (e.g., AWS SDK, gRPC stubs) behind a local interface for testability.
- Return the Target interface from the adapter constructor so callers never see the concrete adapter type.

### Example Structure
```go
type Logger interface{ Log(msg string) }

// Adaptee from a third-party library
type ThirdPartyLogger struct{}
func (l *ThirdPartyLogger) WriteLog(level, msg string) { /* ... */ }

// Adapter
type LoggerAdapter struct{ adaptee *ThirdPartyLogger }

func NewLoggerAdapter() Logger {
    return &LoggerAdapter{adaptee: &ThirdPartyLogger{}}
}

func (a *LoggerAdapter) Log(msg string) {
    a.adaptee.WriteLog("INFO", msg)
}
```

## Java

### Notes
- Object adapter (composition) is preferred over class adapter (multiple inheritance via interface + extends).
- Annotate the adapter with `@Adapter` (custom) or just a descriptive Javadoc linking to the adaptee.
- When adapting multiple similar third-party APIs, consider a common Adapter base class to reduce duplication.
- Use the adapter in tests to wrap real external clients with in-memory fakes.

### Example Structure
```java
interface Logger { void log(String msg); }

// Adaptee (third-party)
class ThirdPartyLogger {
    void writeLog(String level, String msg) { /* ... */ }
}

// Adapter
class LoggerAdapter implements Logger {
    private final ThirdPartyLogger adaptee;
    LoggerAdapter(ThirdPartyLogger adaptee) { this.adaptee = adaptee; }

    @Override
    public void log(String msg) {
        adaptee.writeLog("INFO", msg);
    }
}
```

## Python

### Notes
- Duck typing means adapters are often implicit — if the wrapped object already matches the expected interface, no adapter is needed.
- Use explicit adapters when the method signatures differ significantly or when type annotations are enforced via `Protocol`.
- `__getattr__` delegation can forward unmodified methods to the adaptee, reducing boilerplate.
- Wrap external HTTP clients or SDK objects in an adapter to keep domain code free of SDK dependencies.

### Example Structure
```python
from typing import Protocol

class Logger(Protocol):
    def log(self, msg: str) -> None: ...

class ThirdPartyLogger:
    def write_log(self, level: str, msg: str) -> None: ...

class LoggerAdapter:
    def __init__(self, adaptee: ThirdPartyLogger) -> None:
        self._adaptee = adaptee

    def log(self, msg: str) -> None:
        self._adaptee.write_log("INFO", msg)
```

## Rust

### Notes
- Implement the Target trait for the Adapter struct that wraps the Adaptee.
- Use `newtype` pattern (`struct Adapter(Adaptee)`) for zero-cost wrapping when the adaptee is owned.
- `impl From<Adaptee> for Adapter` enables ergonomic `.into()` conversions at call sites.
- Trait objects (`Box<dyn Target>`) allow storing adapters for different adaptees in the same collection.

### Example Structure
```rust
trait Logger { fn log(&self, msg: &str); }

// Adaptee
struct ThirdPartyLogger;
impl ThirdPartyLogger {
    fn write_log(&self, level: &str, msg: &str) { /* ... */ }
}

// Adapter (newtype)
struct LoggerAdapter(ThirdPartyLogger);

impl Logger for LoggerAdapter {
    fn log(&self, msg: &str) {
        self.0.write_log("INFO", msg);
    }
}
```

## TypeScript

### Notes
- Structural typing: adapters only need to satisfy the target interface shape — no `implements` declaration required.
- Object literal adapters (`const adapter: TargetInterface = { method: args => adaptee.otherMethod(args) }`) are concise and testable.
- `Partial<TargetInterface>` adapters useful when only some target interface methods need adapting.
- Generic adapters: `function adapt<S, T>(source: S, mapping: (s: S) => T): T` for one-off type conversions.

### Example Structure
```typescript
// Target interface (what your application expects)
interface Logger { log(level: 'info' | 'error', message: string): void; }

// Adaptee (third-party library — cannot modify)
interface WinstonLike {
  info(msg: string): void;
  error(msg: string): void;
}

// Object-literal adapter — structural typing means no 'implements' needed
function adaptWinston(winston: WinstonLike): Logger {
  return {
    log: (level, message) =>
      level === 'error' ? winston.error(message) : winston.info(message),
  };
}

// Class adapter (when shared state or multiple methods are needed)
class WinstonAdapter implements Logger {
  constructor(private winston: WinstonLike) {}
  log(level: 'info' | 'error', message: string): void {
    this.winston[level](message);
  }
}
```
