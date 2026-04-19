---
name: Circuit Breaker
category: modern
languages: [go, java, python, rust, typescript, generic]
triggers:
  - external service calls can fail or slow
  - cascading failure prevention
  - fail fast on unhealthy downstream
  - resilience against dependency failures
---

## Overview
Wraps calls to an external service with a state machine that trips to OPEN after a failure threshold, fails fast until a timeout expires, then allows a probe request in HALF-OPEN state before resuming normal operation.

## Components
- **CircuitBreaker**: The state machine (CLOSED, OPEN, HALF-OPEN). Wraps a protected call and tracks failures.
- **CLOSED state**: Normal operation — calls pass through; failures increment a counter.
- **OPEN state**: Fail-fast — all calls immediately return an error without attempting the real call.
- **HALF-OPEN state**: Trial — one call is allowed through; success resets to CLOSED, failure returns to OPEN.
- **Protected Operation**: The external call (HTTP, DB, gRPC) that the circuit breaker guards.

## Constraints
- CircuitBreaker must transition OPEN after reaching the failure threshold within a configured time window.
- OPEN state must have a configurable timeout before transitioning to HALF-OPEN — not an instant retry.
- HALF-OPEN must allow only a limited number of trial calls, not full traffic.
- CircuitBreaker must NOT swallow errors silently; callers must receive a distinct "circuit open" error.

## Anti-Patterns
- Setting failure threshold too low (flapping circuit for normal transient errors).
- Not distinguishing timeout failures from circuit-open failures in error handling at the caller.
- Sharing one CircuitBreaker across multiple distinct downstream services.
- Not exposing circuit state metrics — observability of OPEN/HALF-OPEN transitions is critical.

## Generic Example Structure
```
enum State { CLOSED, OPEN, HALF_OPEN }

CircuitBreaker {
  state: State = CLOSED
  failures: int = 0
  lastFailTime: time
  threshold: int
  timeout: duration

  call(fn: () => Result): Result {
    if state == OPEN {
      if elapsed(lastFailTime) > timeout { state = HALF_OPEN }
      else { return CircuitOpenError }
    }
    result = fn()
    if result.isError() {
      failures++; lastFailTime = now()
      if failures >= threshold { state = OPEN }
    } else {
      failures = 0; state = CLOSED
    }
    return result
  }
}
```

## Go

### Notes
- Use `sony/gobreaker` or `afex/hystrix-go` in production; implement manually for learning.
- Protect the state machine with a `sync.Mutex` or use atomic operations for the failure counter.
- Return a sentinel error (`ErrCircuitOpen`) from the breaker so callers can distinguish it from downstream errors.
- Emit metrics (Prometheus counters) on state transitions for observability.

### Example Structure
```go
type State int
const (Closed State = iota; Open; HalfOpen)

type CircuitBreaker struct {
    mu           sync.Mutex
    state        State
    failures     int
    lastFailure  time.Time
    threshold    int
    timeout      time.Duration
}

var ErrCircuitOpen = errors.New("circuit breaker open")

func (cb *CircuitBreaker) Call(fn func() error) error {
    cb.mu.Lock()
    if cb.state == Open {
        if time.Since(cb.lastFailure) > cb.timeout { cb.state = HalfOpen }
        if cb.state == Open { cb.mu.Unlock(); return ErrCircuitOpen }
    }
    cb.mu.Unlock()

    err := fn()
    cb.mu.Lock(); defer cb.mu.Unlock()
    if err != nil {
        cb.failures++; cb.lastFailure = time.Now()
        if cb.failures >= cb.threshold { cb.state = Open }
    } else {
        cb.failures = 0; cb.state = Closed
    }
    return err
}
```

## Java

### Notes
- Resilience4j `CircuitBreaker` is the standard Java implementation; Spring Cloud integrates it with `@CircuitBreaker`.
- Hystrix is deprecated; migrate to Resilience4j for new projects.
- Configure via `CircuitBreakerConfig.custom().failureRateThreshold(50).waitDurationInOpenState(...)`.
- Fallback methods (`@CircuitBreaker(fallbackMethod = "fallback")`) provide default responses when the circuit is open.

### Example Structure
```java
// Resilience4j usage
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)
    .waitDurationInOpenState(Duration.ofSeconds(30))
    .slidingWindowSize(10)
    .build();

CircuitBreaker cb = CircuitBreakerRegistry.of(config).circuitBreaker("payment-service");

// Wrap call
Supplier<Response> decorated = CircuitBreaker.decorateSupplier(cb, () -> paymentService.charge(amount));
Try<Response> result = Try.ofSupplier(decorated)
    .recover(CallNotPermittedException.class, ex -> fallbackResponse());
```

## Python

### Notes
- `pybreaker` is the most common Python circuit breaker library.
- Implement manually using `threading.Lock` and `time.monotonic()` for lightweight cases.
- Use `tenacity` alongside a circuit breaker — tenacity handles retry with backoff; circuit breaker prevents overload.
- Expose state via a health-check endpoint so orchestrators can route traffic away from failing instances.

### Example Structure
```python
import threading, time
from enum import Enum, auto

class State(Enum): CLOSED = auto(); OPEN = auto(); HALF_OPEN = auto()

class CircuitBreaker:
    def __init__(self, threshold: int = 5, timeout: float = 30.0) -> None:
        self._state = State.CLOSED
        self._failures = 0
        self._last_failure = 0.0
        self._threshold = threshold
        self._timeout = timeout
        self._lock = threading.Lock()

    def call(self, fn):
        with self._lock:
            if self._state == State.OPEN:
                if time.monotonic() - self._last_failure > self._timeout:
                    self._state = State.HALF_OPEN
                else:
                    raise RuntimeError("Circuit breaker open")
        try:
            result = fn()
            with self._lock: self._failures = 0; self._state = State.CLOSED
            return result
        except Exception:
            with self._lock:
                self._failures += 1; self._last_failure = time.monotonic()
                if self._failures >= self._threshold: self._state = State.OPEN
            raise
```

## Rust

### Notes
- Use `std::sync::Mutex` to protect the circuit breaker state; `Instant::now()` for timing.
- Return `Result<T, CircuitBreakerError>` — callers match on `CircuitBreakerError::Open` vs actual errors.
- `tokio::sync::Mutex` is needed for async protected functions.
- Expose state via `pub fn state(&self) -> State` for monitoring dashboards.

### Example Structure
```rust
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(PartialEq, Clone)]
enum State { Closed, Open, HalfOpen }

pub struct CircuitBreaker {
    inner: Mutex<BreakerState>,
}
struct BreakerState { state: State, failures: u32, last_failure: Option<Instant>, threshold: u32, timeout: Duration }

impl CircuitBreaker {
    pub fn call<F, T, E>(&self, f: F) -> Result<T, BreakerError<E>>
    where F: FnOnce() -> Result<T, E> {
        // check/transition state, call f(), update state
        todo!()
    }
}
```

## TypeScript

### Notes
- `opossum` is the standard Node.js circuit breaker library — wraps any `async` function, no custom state machine needed.
- Manual implementation: closure state (`let state: 'closed' | 'open' | 'half-open'`) + an `async` wrapper function.
- `opossum` fires typed events: `'open'`, `'close'`, `'halfOpen'`, `'fallback'` — wire these to metrics/alerting.
- Combine with retry: the circuit breaker wraps the retry-wrapped function, not individual retry attempts.

### Example Structure
```typescript
import CircuitBreaker from 'opossum';

async function callPaymentService(orderId: string): Promise<PaymentResult> {
  const resp = await fetch(`https://payment-service/pay/${orderId}`, { method: 'POST' });
  if (!resp.ok) throw new Error(`Payment failed: ${resp.status}`);
  return resp.json() as Promise<PaymentResult>;
}

const breaker = new CircuitBreaker(callPaymentService, {
  timeout:                  3000,  // fail after 3 s
  errorThresholdPercentage: 50,    // open after 50% errors
  resetTimeout:             30000, // retry after 30 s
});

breaker.fallback(() => ({ status: 'pending', message: 'Payment service unavailable' }));
breaker.on('open',     () => console.warn('Payment circuit OPEN'));
breaker.on('halfOpen', () => console.info('Payment circuit HALF-OPEN — testing'));
breaker.on('close',    () => console.info('Payment circuit CLOSED — recovered'));

export const processPayment = (orderId: string) => breaker.fire(orderId);
```
