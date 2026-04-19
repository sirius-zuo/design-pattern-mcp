---
name: Retry with Backoff
category: modern
languages: [go, java, python, rust, typescript, generic]
triggers:
  - transient failures in network calls
  - idempotent operations that may fail temporarily
  - jitter to avoid thundering herd
  - exponential backoff
---

## Overview
Automatically retries a failed operation with increasing delays between attempts. Exponential backoff with jitter spreads retries over time, preventing synchronized retry storms against a recovering service.

## Components
- **RetryPolicy**: Configuration — max attempts, base delay, multiplier, max delay, jitter strategy.
- **Retryable Operation**: The idempotent function to retry on transient failure.
- **Backoff Calculator**: Computes the wait time for attempt N: `min(base * multiplier^N, maxDelay) + jitter`.
- **Error Classifier**: Determines whether a given error is retryable (e.g., 5xx but not 4xx, timeout but not auth failure).

## Constraints
- Only retry idempotent operations — retrying non-idempotent operations can cause duplicate side effects.
- Must cap max delay to prevent unbounded wait times.
- Must add random jitter to break synchronized retry waves from multiple clients.
- Must classify errors before retrying — retrying non-transient errors (auth failure, bad request) wastes resources.

## Anti-Patterns
- Retrying on every error regardless of type (retrying a 400 Bad Request is pointless).
- Retry with fixed delay (no backoff) — all clients retry simultaneously on recovery.
- Unlimited retries — always set a max attempt count or total timeout budget.
- Retrying non-idempotent operations (e.g., financial transactions) without deduplication.

## Generic Example Structure
```
RetryPolicy {
  maxAttempts: 3
  baseDelay: 100ms
  multiplier: 2.0
  maxDelay: 30s
  jitter: 0..25%
}

retry(fn: () => Result, policy: RetryPolicy): Result {
  for attempt in 1..policy.maxAttempts {
    result = fn()
    if result.ok() { return result }
    if not isRetryable(result.error) { return result }
    if attempt < maxAttempts {
      wait = min(baseDelay * multiplier^attempt, maxDelay)
      wait += random(0, wait * jitter)
      sleep(wait)
    }
  }
  return result
}
```

## Go

### Notes
- `cenkalti/backoff` is the idiomatic Go library for retry with exponential backoff.
- Manual implementation: use `time.Sleep` and a loop capped by `context.Context` for cancellation.
- Pass `context.Context` to the retryable function so callers can cancel the retry loop.
- Jitter: use `rand.Int63n(jitterRange)` to add randomness; seed from `crypto/rand` for production.

### Example Structure
```go
import (
    "context"
    "math/rand"
    "time"
)

type RetryPolicy struct {
    MaxAttempts int
    BaseDelay   time.Duration
    MaxDelay    time.Duration
    Multiplier  float64
}

func Retry(ctx context.Context, policy RetryPolicy, fn func() error) error {
    delay := policy.BaseDelay
    for attempt := 0; attempt < policy.MaxAttempts; attempt++ {
        if err := fn(); err == nil { return nil }
        if attempt == policy.MaxAttempts-1 { break }
        jitter := time.Duration(rand.Int63n(int64(delay) / 4))
        select {
        case <-ctx.Done(): return ctx.Err()
        case <-time.After(delay + jitter):
        }
        delay = min(time.Duration(float64(delay)*policy.Multiplier), policy.MaxDelay)
    }
    return fn()
}
```

## Java

### Notes
- Resilience4j `Retry` combined with `ExponentialBackoff` is the standard Java approach.
- Spring Retry `@Retryable(maxAttempts=3, backoff=@Backoff(delay=1000, multiplier=2))` for declarative retry.
- `RetryTemplate` in Spring Retry provides programmatic control.
- Always pair retry with a `RetryableException` classifier to distinguish transient from permanent failures.

### Example Structure
```java
// Resilience4j
IntervalFunction backoff = IntervalFunction.ofExponentialRandomBackoff(
    Duration.ofMillis(100), 2.0, Duration.ofSeconds(30));

RetryConfig config = RetryConfig.custom()
    .maxAttempts(3)
    .intervalFunction(backoff)
    .retryOnException(e -> e instanceof IOException)
    .build();

Retry retry = Retry.of("service", config);
Supplier<Response> decorated = Retry.decorateSupplier(retry, () -> callExternalService());
Response result = Try.ofSupplier(decorated).getOrElseThrow(identity());
```

## Python

### Notes
- `tenacity` is the idiomatic Python retry library: `@retry(stop=stop_after_attempt(3), wait=wait_exponential(...))`.
- `wait_exponential_jitter(initial=0.1, max=30)` adds built-in jitter in `tenacity`.
- For async code, `tenacity` supports `@retry` on `async def` functions.
- Classify retryable errors with `retry=retry_if_exception_type((TimeoutError, ConnectionError))`.

### Example Structure
```python
from tenacity import (
    retry, stop_after_attempt, wait_exponential_jitter,
    retry_if_exception_type
)
import httpx

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=0.1, exp_base=2, max=30),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
)
def call_payment_service(amount: float) -> dict:
    response = httpx.post("https://payments.example.com/charge", json={"amount": amount})
    response.raise_for_status()
    return response.json()
```

## Rust

### Notes
- `tokio-retry` provides exponential backoff strategies for async Rust.
- Manual implementation with `tokio::time::sleep` and an exponential delay formula is straightforward.
- Use `Duration::from_millis(base * 2u64.pow(attempt)).min(max_delay)` for the delay calculation.
- Pass a `CancellationToken` from `tokio_util::sync` to abort retries on shutdown.

### Example Structure
```rust
use std::time::Duration;
use tokio::time::sleep;

pub async fn retry_with_backoff<F, Fut, T, E>(
    max_attempts: u32,
    base_ms: u64,
    max_ms: u64,
    mut f: F,
) -> Result<T, E>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<T, E>>,
{
    for attempt in 0..max_attempts {
        match f().await {
            Ok(val) => return Ok(val),
            Err(e) if attempt + 1 == max_attempts => return Err(e),
            Err(_) => {
                let delay = (base_ms * 2u64.pow(attempt)).min(max_ms);
                let jitter = rand::random::<u64>() % (delay / 4 + 1);
                sleep(Duration::from_millis(delay + jitter)).await;
            }
        }
    }
    unreachable!()
}
```

## TypeScript

### Notes
- Pure `async`/`await` with a `for` loop and `setTimeout` promise is idiomatic for basic retry — no extra library needed.
- `p-retry` npm package for production retry with configurable strategies, typed errors, and abort signals.
- Exponential backoff: `delay = baseMs * 2 ** (attempt - 1)` with optional jitter `+ Math.random() * baseMs`.
- Typed error filtering: `if (!(err instanceof RetryableError)) throw err` to only retry transient failures.

### Example Structure
```typescript
class RetryableError extends Error {}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 100 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof RetryableError)) throw err;
      if (attempt === maxAttempts) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * baseDelayMs;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('unreachable');
}

// Usage
const data = await withRetry(
  () => fetch('https://api.example.com/data').then(r => r.json()),
  { maxAttempts: 4, baseDelayMs: 200 },
);
```
