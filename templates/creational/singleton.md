---
name: Singleton
category: creational
languages: [go, java, python, rust, typescript, generic]
triggers:
  - exactly one instance required
  - global coordination point
  - shared resource manager
  - ensure single access point to resource
---

## Overview
Ensures a class has only one instance and provides a global access point to it. Useful for resources that must be shared and initialized exactly once (configuration, connection pools, caches).

## Components
- **Singleton**: The class that restricts instantiation to a single instance and exposes it via a static accessor.
- **Instance** (private field): The sole instance, held as a static/class-level variable.
- **GetInstance() / instance accessor**: The public entry point that creates the instance on first call and returns the same instance on subsequent calls.

## Constraints
- The constructor must be private (or equivalent) to prevent external instantiation.
- `GetInstance()` must be thread-safe; lazy initialization requires synchronization or atomic operations.
- The Singleton must NOT own mutable global state that creates hidden coupling between unrelated parts of the system.
- Avoid using Singleton as a substitute for proper dependency injection — prefer injecting the single instance.

## Anti-Patterns
- Using a public constructor alongside a `getInstance()` method — allows multiple instances to be created.
- Holding heavy mutable state in a Singleton accessed by many goroutines/threads without synchronization.
- Singletons that perform I/O or network calls in `GetInstance()` (makes tests slow and flaky).
- Treating Singleton as the solution to every global variable problem — it adds hidden dependencies and hurts testability.

## Generic Example Structure
```
class Singleton {
  private static instance: Singleton = null

  private Singleton() { /* initialization */ }

  static getInstance(): Singleton {
    if instance == null {
      instance = new Singleton()
    }
    return instance
  }

  doWork(): void { /* ... */ }
}
```

## Go

### Notes
- Use `sync.Once` for thread-safe lazy initialization — the idiomatic Go approach.
- Package-level `var` with `init()` works for eager initialization of simple singletons.
- Prefer passing the singleton as a dependency (constructor injection) rather than calling `GetInstance()` deep inside business logic.
- Consider whether a package-level variable (unexported) achieves the same goal without the pattern overhead.

### Example Structure
```go
import "sync"

type Config struct{ dsn string }

var (
    instance *Config
    once     sync.Once
)

func GetInstance() *Config {
    once.Do(func() {
        instance = &Config{dsn: loadDSN()}
    })
    return instance
}

func loadDSN() string { return "postgres://..." }
```

## Java

### Notes
- Double-checked locking with `volatile` is the classic thread-safe lazy singleton; prefer `enum` singleton for simplicity.
- `enum` singleton is the safest Java pattern: thread-safe, serialization-safe, reflection-safe.
- Spring beans are singletons by default (`@Bean` / `@Component` with default scope); avoid hand-rolled singletons in Spring apps.
- Test frameworks can struggle to reset singletons between tests — inject the instance instead of using static access.

### Example Structure
```java
// Enum singleton (preferred)
public enum AppConfig {
    INSTANCE;
    private final String dsn = loadDSN();
    public String getDsn() { return dsn; }
    private String loadDSN() { return "postgres://..."; }
}

// Double-checked locking (legacy codebases)
public class AppConfigDCL {
    private static volatile AppConfigDCL instance;
    private AppConfigDCL() {}
    public static AppConfigDCL getInstance() {
        if (instance == null) synchronized (AppConfigDCL.class) {
            if (instance == null) instance = new AppConfigDCL();
        }
        return instance;
    }
}
```

## Python

### Notes
- Override `__new__` to return the same instance on every call.
- Module-level variables are natural singletons in Python — often the simplest approach.
- Use `threading.Lock` for thread-safe lazy initialization in multi-threaded contexts.
- `functools.lru_cache` on a factory function caches the result, effectively making it a singleton.

### Example Structure
```python
import threading

class Config:
    _instance: "Config | None" = None
    _lock = threading.Lock()

    def __new__(cls) -> "Config":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._dsn = "postgres://..."
        return cls._instance

    @property
    def dsn(self) -> str:
        return self._dsn
```

## Rust

### Notes
- Use `once_cell::sync::Lazy` or `std::sync::OnceLock` (stable since 1.70) for thread-safe lazy statics.
- `static INSTANCE: OnceLock<Config> = OnceLock::new()` is the idiomatic standard-library approach.
- Global mutable state (`static mut`) is `unsafe`; prefer interior mutability (`Mutex<T>` inside `OnceLock`).
- In library code, avoid module-level singletons; accept the instance as a parameter to keep code testable.

### Example Structure
```rust
use std::sync::{OnceLock, Mutex};

#[derive(Debug)]
struct Config { dsn: String }

static INSTANCE: OnceLock<Mutex<Config>> = OnceLock::new();

fn get_instance() -> &'static Mutex<Config> {
    INSTANCE.get_or_init(|| {
        Mutex::new(Config { dsn: "postgres://...".into() })
    })
}
```

## TypeScript

### Notes
- Module-level `export const instance = new MyClass()` is the idiomatic TypeScript singleton — the Node.js module cache guarantees a single instance.
- Class-based singleton with `private constructor` + `static getInstance()` is legacy style; use only when lazy initialization is strictly required.
- For testability: dependency-inject the singleton rather than importing it directly in production code.
- `Object.freeze(instance)` prevents accidental mutation of singleton state in a shared module.

### Example Structure
```typescript
// Idiomatic — module-level singleton (leverages Node.js module cache)
class DatabaseConnection {
  private constructor(private readonly url: string) {}
  query(sql: string): Promise<unknown[]> { /* ... */ return Promise.resolve([]); }

  static create(url: string): DatabaseConnection { return new DatabaseConnection(url); }
}

export const db = DatabaseConnection.create(process.env.DATABASE_URL!);

// Usage in any other module
import { db } from './database';
db.query('SELECT 1');

// Class-based (legacy — use only when lazy init is needed)
class Registry {
  private static instance: Registry | null = null;
  private constructor(private data = new Map<string, string>()) {}

  static getInstance(): Registry {
    return (Registry.instance ??= new Registry());
  }
  get(key: string): string | undefined { return this.data.get(key); }
}
```
