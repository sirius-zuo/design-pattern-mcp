---
name: Chain of Responsibility
category: behavioral
languages: [go, java, python, rust, generic]
triggers:
  - multiple potential handlers for a request
  - handler not known a priori
  - configurable handler chain
  - decouple sender from receiver
---

## Overview
Passes a request along a chain of handlers. Each handler decides to process the request or pass it to the next handler in the chain. The sender does not know which handler will ultimately handle the request.

## Components
- **Handler** (interface): Declares the handling method and a reference to the next handler in the chain.
- **BaseHandler** (optional): Abstract class that implements the default pass-through logic and stores the next handler reference.
- **ConcreteHandler**: Processes requests it is responsible for; passes others to the next handler.
- **Client**: Builds the chain and sends requests to the first handler.

## Constraints
- Handler must NOT assume it is the last in the chain; always call `next.handle()` if the request is not handled.
- The chain must be assembled by the client or a separate configurator, NOT inside handlers themselves.
- Handlers must NOT hold a back-reference to the previous handler — the chain is one-directional.
- If no handler processes the request, the chain must define a clear fallback behavior (return nil, error, or a NoOp handler).

## Anti-Patterns
- Handlers that sometimes call next and sometimes do not, with no clear rule — makes chain behavior unpredictable.
- Building the chain inside individual handler constructors (hidden coupling between handlers).
- Using Chain of Responsibility when only one handler will ever match — a simple if/switch is clearer.
- Passing mutable state through the chain without documenting which handlers modify it.

## Generic Example Structure
```
interface Handler {
  setNext(h: Handler): Handler
  handle(req: Request): Response
}

BaseHandler implements Handler {
  next: Handler
  setNext(h): Handler { next = h; return h }
  handle(req): Response {
    if next != null { return next.handle(req) }
    return null
  }
}

AuthHandler extends BaseHandler {
  handle(req): Response {
    if !authenticated(req) { return Unauthorized }
    return super.handle(req)
  }
}

RateLimitHandler extends BaseHandler {
  handle(req): Response {
    if rateLimitExceeded(req) { return TooManyRequests }
    return super.handle(req)
  }
}
```

## Go

### Notes
- Model the chain as a linked list of `Handler` interface values; each holds a `next Handler` field.
- Middleware chains in `net/http` are a canonical Go application of this pattern.
- Return `(Response, bool)` or `(Response, error)` from `Handle()` to distinguish "handled" from "not handled."
- Functional middleware `func(Handler) Handler` is idiomatic for HTTP pipelines.

### Example Structure
```go
type Handler interface{ Handle(req *Request) *Response }

type BaseHandler struct{ next Handler }
func (b *BaseHandler) SetNext(h Handler) Handler { b.next = h; return h }
func (b *BaseHandler) HandleNext(req *Request) *Response {
    if b.next != nil { return b.next.Handle(req) }
    return nil
}

type AuthHandler struct{ BaseHandler }
func (h *AuthHandler) Handle(req *Request) *Response {
    if !req.IsAuthenticated { return &Response{Status: 401} }
    return h.HandleNext(req)
}
```

## Java

### Notes
- Use an abstract `BaseHandler` class to provide default pass-through `handle()` and `setNext()` implementations.
- `Optional<Response>` return type communicates clearly that the chain might not produce a result.
- Servlet filters and Spring `HandlerInterceptor` are built-in chain-of-responsibility implementations.
- Build chains using a fluent builder: `auth.setNext(rateLimit).setNext(logger)`.

### Example Structure
```java
abstract class Handler {
    private Handler next;
    public Handler setNext(Handler h) { this.next = h; return h; }
    public abstract Response handle(Request req);
    protected Response handleNext(Request req) {
        return next != null ? next.handle(req) : null;
    }
}

class AuthHandler extends Handler {
    public Response handle(Request req) {
        if (!req.isAuthenticated()) return new Response(401);
        return handleNext(req);
    }
}
```

## Python

### Notes
- Implement the chain using a linked list of handler objects or a list traversed sequentially.
- `__call__` makes handlers callable as middleware functions in WSGI/ASGI frameworks.
- Type-annotate `next_handler` as `Optional[Handler]` and `handle()` return as `Optional[Response]`.
- Consider using a simple list of callables and iterating for straightforward pipelines.

### Example Structure
```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional

class Handler(ABC):
    def __init__(self) -> None:
        self._next: Optional[Handler] = None

    def set_next(self, handler: Handler) -> Handler:
        self._next = handler
        return handler

    @abstractmethod
    def handle(self, request: dict) -> Optional[str]: ...

    def handle_next(self, request: dict) -> Optional[str]:
        return self._next.handle(request) if self._next else None

class AuthHandler(Handler):
    def handle(self, request: dict) -> Optional[str]:
        if not request.get("authenticated"):
            return "401 Unauthorized"
        return self.handle_next(request)
```

## Rust

### Notes
- Represent the chain as a `Vec<Box<dyn Handler>>` and iterate, or as a linked structure with `Option<Box<dyn Handler>>`.
- Return `Option<Response>` from `handle()` — `None` means "not handled, pass to next."
- Closures in a `Vec<Box<dyn Fn(&Request) -> Option<Response>>>` are idiomatic for simple pipelines.
- Recursive chain structures require `Box` to avoid infinite-size types.

### Example Structure
```rust
trait Handler {
    fn handle(&self, req: &Request) -> Option<Response>;
}

struct ChainRunner { handlers: Vec<Box<dyn Handler>> }

impl ChainRunner {
    fn run(&self, req: &Request) -> Option<Response> {
        self.handlers.iter().find_map(|h| h.handle(req))
    }
}

struct AuthHandler;
impl Handler for AuthHandler {
    fn handle(&self, req: &Request) -> Option<Response> {
        if !req.authenticated { Some(Response { status: 401 }) } else { None }
    }
}
```
