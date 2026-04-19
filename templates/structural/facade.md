---
name: Facade
category: structural
languages: [go, java, python, rust, typescript, generic]
triggers:
  - simplify complex subsystem interface
  - decouple clients from subsystem internals
  - repeated orchestration of subsystem calls
  - provide unified API
---

## Overview
Provides a simplified interface to a complex subsystem, hiding its internal complexity. Clients interact only with the Facade, while the subsystem classes remain available for advanced use when needed.

## Components
- **Facade**: The simplified API. Knows which subsystem classes to use and how to orchestrate them. Delegates all real work to subsystem classes.
- **Subsystem Classes**: Implement the actual functionality. Unaware of the Facade. Can still be used directly by advanced clients.
- **Client**: Interacts with the Facade only; does not instantiate or call subsystem classes directly for standard workflows.

## Constraints
- Facade must NOT duplicate subsystem logic — it only orchestrates; all real work stays in subsystem classes.
- Subsystem classes must remain independently usable; the Facade does not own or encapsulate them exclusively.
- Facade methods must map to meaningful, complete user actions — not just single subsystem calls (use Adapter for that).
- Facade must NOT become a God-Object; split into multiple focused facades when the API grows beyond ~7 methods.

## Anti-Patterns
- Re-implementing subsystem logic inside the Facade instead of delegating to subsystem classes.
- Making Facade the only way to access subsystems (it should simplify access, not monopolize it).
- Adding application-specific business logic to the Facade — put that in a Service or Use Case layer.
- Creating a single mega-Facade for the entire application (defeats the principle of focused interfaces).

## Generic Example Structure
```
SubsystemA { operationA1(); operationA2() }
SubsystemB { operationB1() }
SubsystemC { operationC1(); operationC2() }

Facade {
  a: SubsystemA
  b: SubsystemB
  c: SubsystemC

  doComplexOperation(): Result {
    a.operationA1()
    b.operationB1()
    c.operationC1()
    return a.operationA2() + c.operationC2()
  }
}
```

## Go

### Notes
- Implement Facade as a struct holding references (interfaces) to subsystem objects.
- Accept subsystem dependencies via constructor injection to keep Facade testable.
- Return an interface from the Facade constructor so callers can substitute a mock in tests.
- Package-level functions (e.g., `video.Convert(...)`) can act as a lightweight Facade for a package.

### Example Structure
```go
type VideoFacade struct {
    decoder  VideoDecoder
    effects  EffectsEngine
    encoder  VideoEncoder
}

func NewVideoFacade(d VideoDecoder, e EffectsEngine, enc VideoEncoder) *VideoFacade {
    return &VideoFacade{decoder: d, effects: e, encoder: enc}
}

func (f *VideoFacade) Convert(src, dst, format string) error {
    raw, err := f.decoder.Decode(src)
    if err != nil { return err }
    processed := f.effects.Apply(raw)
    return f.encoder.Encode(processed, dst, format)
}
```

## Java

### Notes
- Facade is typically a plain class with constructor-injected subsystem dependencies.
- Spring `@Service` classes often act as facades orchestrating repositories and domain services.
- Mark subsystem classes package-private when they should not be accessed directly outside the module.
- Use the Facade in API controllers to keep them thin — one controller method calls one facade method.

### Example Structure
```java
class VideoFacade {
    private final VideoDecoder decoder;
    private final EffectsEngine effects;
    private final VideoEncoder encoder;

    VideoFacade(VideoDecoder decoder, EffectsEngine effects, VideoEncoder encoder) {
        this.decoder = decoder; this.effects = effects; this.encoder = encoder;
    }

    public void convert(String src, String dst, String format) throws IOException {
        RawVideo raw = decoder.decode(src);
        ProcessedVideo processed = effects.apply(raw);
        encoder.encode(processed, dst, format);
    }
}
```

## Python

### Notes
- Facade is a plain class; inject subsystem instances in `__init__` for testability.
- Module-level functions can serve as a Facade when the subsystems are module-scoped singletons.
- Use `typing.Protocol` to type-annotate the subsystem dependencies without hard-coding concrete classes.
- Context managers (`with Facade() as f:`) work well for facades that manage resource lifecycles.

### Example Structure
```python
class VideoFacade:
    def __init__(
        self,
        decoder: VideoDecoder,
        effects: EffectsEngine,
        encoder: VideoEncoder,
    ) -> None:
        self._decoder = decoder
        self._effects = effects
        self._encoder = encoder

    def convert(self, src: str, dst: str, fmt: str) -> None:
        raw = self._decoder.decode(src)
        processed = self._effects.apply(raw)
        self._encoder.encode(processed, dst, fmt)
```

## Rust

### Notes
- Facade is a struct that owns or borrows subsystem instances; use owned instances for simplicity.
- Define subsystem dependencies as trait objects (`Box<dyn SubsystemA>`) for testability.
- A module with public functions and private implementation structs is an idiomatic Rust Facade.
- `impl Facade` groups all high-level operations; subsystem types remain in private submodules.

### Example Structure
```rust
struct VideoFacade {
    decoder: Box<dyn VideoDecoder>,
    effects: Box<dyn EffectsEngine>,
    encoder: Box<dyn VideoEncoder>,
}

impl VideoFacade {
    pub fn new(d: Box<dyn VideoDecoder>, e: Box<dyn EffectsEngine>, enc: Box<dyn VideoEncoder>) -> Self {
        Self { decoder: d, effects: e, encoder: enc }
    }

    pub fn convert(&self, src: &str, dst: &str, format: &str) -> Result<(), Error> {
        let raw = self.decoder.decode(src)?;
        let processed = self.effects.apply(raw);
        self.encoder.encode(processed, dst, format)
    }
}
```

## TypeScript

### Notes
- Async facade: all methods `async`, `await`ing multiple subsystem calls; callers see a simple `Promise<Result>`.
- `private readonly` subsystem dependencies injected via constructor — enables testing with mock implementations.
- For NestJS: a Facade is typically a Service that orchestrates multiple other Services or repositories.
- TypeScript discriminated union return types (`Promise<{ ok: true; data: D } | { ok: false; error: string }>`) make facade errors explicit.

### Example Structure
```typescript
class OrderFacade {
  constructor(
    private readonly inventory: InventoryService,
    private readonly payment: PaymentService,
    private readonly shipping: ShippingService,
    private readonly notifications: NotificationService,
  ) {}

  async placeOrder(order: PlaceOrderRequest): Promise<OrderConfirmation> {
    await this.inventory.reserve(order.items);
    const charge   = await this.payment.charge({ amount: order.total, method: order.paymentMethod });
    const tracking = await this.shipping.schedule(order.address, order.items);
    await this.notifications.sendConfirmation(order.customerId, tracking.number);
    return { orderId: order.id, chargeId: charge.id, trackingNumber: tracking.number };
  }
}
```
