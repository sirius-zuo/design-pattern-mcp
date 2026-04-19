---
name: Proxy
category: structural
aliases: []
languages: [go, java, python, rust, typescript, generic]
triggers:
  - control access to object
  - lazy initialization
  - caching results
  - remote object access
  - access control enforcement
  - virtual proxy for expensive objects
---

## Overview
Provides a surrogate or placeholder for another object to control access to it. The proxy implements the same interface as the real subject and intercepts calls to add access control, lazy initialization, caching, or logging.

## Components
- **Subject** (interface): Common interface for both RealSubject and Proxy.
- **RealSubject**: The actual object that does the real work; expensive to create or restricted.
- **Proxy**: Implements Subject and holds a reference to RealSubject. Intercepts calls and may forward, cache, or deny them.
- **Client**: Works with Subject interface; unaware whether it holds a Proxy or RealSubject.

## Constraints
- Proxy must implement the same interface as RealSubject — clients must be substitutable.
- Proxy must NOT change the semantic result of an operation unless it is explicitly a caching or filtering proxy.
- Proxy must NOT add business logic — it is an infrastructure concern (access, caching, remoting, logging).
- Virtual proxy must initialize RealSubject lazily and only once (thread-safe initialization).

## Anti-Patterns
- Proxy that changes business behavior (use Decorator for adding behavior; Proxy controls access).
- Proxy that always initializes RealSubject eagerly (defeats virtual proxy purpose).
- Leaking the RealSubject reference through the Proxy so clients can bypass it.
- Using Proxy to add multiple unrelated concerns — compose specialized proxies or use a Decorator chain instead.

## Generic Example Structure
```
interface Subject { request(): Response }

RealSubject implements Subject {
  request(): Response { /* expensive real work */ }
}

Proxy implements Subject {
  real: RealSubject  // lazy-initialized
  request(): Response {
    if not authorized() { throw AccessDenied }
    if real == null { real = RealSubject() }
    return real.request()
  }
}
```

## Go

### Notes
- Implement the Proxy as a struct with the same interface; wrap the real subject via composition.
- `sync.Once` for lazy initialization of the real subject in a virtual proxy.
- HTTP reverse proxy (`httputil.ReverseProxy`) is a canonical Go remote proxy.
- Return the Subject interface from the proxy constructor to keep clients decoupled from the proxy type.

### Example Structure
```go
type Service interface{ Fetch(id int) (Data, error) }

type RealService struct{}
func (s *RealService) Fetch(id int) (Data, error) { /* DB call */ return Data{}, nil }

type CachingProxy struct {
    real  Service
    cache map[int]Data
    mu    sync.RWMutex
}

func NewCachingProxy(real Service) Service { return &CachingProxy{real: real, cache: map[int]Data{}} }

func (p *CachingProxy) Fetch(id int) (Data, error) {
    p.mu.RLock()
    if d, ok := p.cache[id]; ok { p.mu.RUnlock(); return d, nil }
    p.mu.RUnlock()
    d, err := p.real.Fetch(id)
    if err == nil { p.mu.Lock(); p.cache[id] = d; p.mu.Unlock() }
    return d, err
}
```

## Java

### Notes
- Java dynamic proxies (`java.lang.reflect.Proxy`) generate proxies at runtime for any interface.
- Spring AOP creates proxies transparently for `@Transactional`, `@Cacheable`, `@PreAuthorize`.
- Use the Proxy pattern explicitly (not AOP) when the logic is closely tied to the specific subject.
- `volatile` + double-checked locking for lazy initialization of RealSubject in a virtual proxy.

### Example Structure
```java
interface Service { Data fetch(int id); }

class RealService implements Service {
    public Data fetch(int id) { /* DB */ return new Data(); }
}

class CachingProxy implements Service {
    private final Service real;
    private final Map<Integer, Data> cache = new HashMap<>();
    CachingProxy(Service real) { this.real = real; }

    public Data fetch(int id) {
        return cache.computeIfAbsent(id, real::fetch);
    }
}
```

## Python

### Notes
- Use `__getattr__` delegation for a generic transparent proxy that forwards unknown attribute access.
- `functools.cached_property` implements a lazy-initializing virtual proxy for a single attribute.
- Python's `unittest.mock.MagicMock` is a test-double proxy that records all accesses.
- For access control proxies, validate permissions in each method before delegating to the real subject.

### Example Structure
```python
from typing import Protocol
from functools import lru_cache

class Service(Protocol):
    def fetch(self, id: int) -> "Data": ...

class RealService:
    def fetch(self, id: int) -> "Data": return Data()

class CachingProxy:
    def __init__(self, real: Service) -> None:
        self._real = real
        self._cache: dict[int, "Data"] = {}

    def fetch(self, id: int) -> "Data":
        if id not in self._cache:
            self._cache[id] = self._real.fetch(id)
        return self._cache[id]
```

## Rust

### Notes
- Implement the Subject trait for the Proxy struct; hold the real subject as `Box<dyn Subject>` or a concrete type.
- `OnceCell` or `OnceLock` enables lazy initialization of the real subject in a virtual proxy.
- `Arc<Mutex<Option<RealSubject>>>` patterns handle concurrent virtual proxy initialization.
- Derive `Deref` to forward method calls automatically when most operations pass through unchanged.

### Example Structure
```rust
trait Service { fn fetch(&self, id: u32) -> Data; }

struct RealService;
impl Service for RealService { fn fetch(&self, _id: u32) -> Data { Data } }

use std::collections::HashMap;
use std::sync::Mutex;

struct CachingProxy {
    real: Box<dyn Service>,
    cache: Mutex<HashMap<u32, Data>>,
}

impl Service for CachingProxy {
    fn fetch(&self, id: u32) -> Data {
        let mut cache = self.cache.lock().unwrap();
        if let Some(d) = cache.get(&id) { return d.clone(); }
        let d = self.real.fetch(id);
        cache.insert(id, d.clone());
        d
    }
}
```

## TypeScript

### Notes
- Built-in `Proxy` object handles get/set/apply/has traps natively — no wrapper class required for common use cases.
- `Reflect.*` methods forward trapped operations to the target without losing `this` binding or prototype chain.
- Virtual proxy with lazy loading: `new Proxy({} as Service, { get: lazyInit })` delays expensive initialization until first access.
- `Proxy<T>` maintains TypeScript type safety — the proxy is typed as `T`, not a special wrapper type.

### Example Structure
```typescript
// Logging proxy — intercepts all method calls
function createLoggingProxy<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value !== 'function') return value;
      return function (...args: unknown[]) {
        console.log(`→ ${String(prop)}(${args.map(String).join(', ')})`);
        return (value as Function).apply(obj, args);
      };
    },
  });
}

// Virtual proxy — lazy initialization
function createLazyProxy<T extends object>(factory: () => T): T {
  let instance: T | null = null;
  return new Proxy({} as T, {
    get(_, prop, receiver) {
      if (!instance) instance = factory();
      return Reflect.get(instance, prop, receiver);
    },
  });
}
```
