---
name: Saga
category: modern
languages: [go, java, python, rust, typescript, generic]
triggers:
  - long-running distributed transaction
  - no 2-phase commit available
  - compensating transactions for rollback
  - coordinate multiple microservices
---

## Overview
Manages a long-running business transaction spanning multiple services by breaking it into a sequence of local transactions. Each step publishes an event or sends a command; on failure, compensating transactions undo completed steps.

## Components
- **Saga Orchestrator**: (Orchestration style) Coordinates the sequence of steps; sends commands and reacts to responses.
- **Saga Participant**: A microservice that executes a local transaction and replies with success/failure.
- **Compensating Transaction**: The undo operation for a completed step; executed in reverse order on failure.
- **Saga Log**: Records which steps have completed so recovery can resume or compensate after a crash.

## Constraints
- Each step's local transaction must be atomic within its own service — sagas do NOT provide ACID across services.
- Compensating transactions must be idempotent — they may be retried multiple times.
- Saga log must be persisted durably before acknowledging step completion (crash-safe progress tracking).
- Services must NOT assume immediate consistency — intermediate states will be visible until the saga completes.

## Anti-Patterns
- Using sagas where a local transaction within a single service suffices (unnecessary complexity).
- Compensating transactions that are not truly reversible (e.g., sending an email cannot be un-sent — use idempotency tokens).
- Saga orchestrator that contains business rules (it should only coordinate flow, not decide outcomes).
- Saga without a saga log — a crash mid-flight leaves the system in an unknown partial state.

## Generic Example Structure
```
Saga: OrderFulfillment

Step 1: ReserveInventory
  → on success: proceed to Step 2
  → on failure: end (nothing to compensate)

Step 2: ChargePayment
  → on success: proceed to Step 3
  → on failure: compensate Step 1 (ReleaseInventory)

Step 3: CreateShipment
  → on success: saga complete
  → on failure: compensate Step 2 (RefundPayment)
                compensate Step 1 (ReleaseInventory)
```

## Go

### Notes
- Implement saga as a struct that advances a step counter; persist state to a saga log table after each step.
- Use channels or message queues (NATS, Kafka) for participant communication in event-driven sagas.
- Each step method returns `(succeeded bool, compensate func() error)` so the orchestrator can roll back.
- `Temporal.io` provides a durable workflow engine for Go that handles saga state persistence automatically.

### Example Structure
```go
type OrderSagaState struct {
    OrderID   uuid.UUID
    Step      int
    Status    string
}

type OrderSaga struct {
    state     OrderSagaState
    inventory InventoryService
    payment   PaymentService
    log       SagaLog
}

func (s *OrderSaga) Execute() error {
    if err := s.inventory.Reserve(s.state.OrderID); err != nil {
        return fmt.Errorf("reserve inventory: %w", err)
    }
    s.state.Step = 1; s.log.Save(s.state)

    if err := s.payment.Charge(s.state.OrderID); err != nil {
        s.inventory.Release(s.state.OrderID) // compensate
        return fmt.Errorf("charge payment: %w", err)
    }
    s.state.Step = 2; s.log.Save(s.state)
    s.state.Status = "complete"
    return nil
}
```

## Java

### Notes
- Axon Sagas (`@Saga`, `@SagaEventHandler`, `@EndSaga`) handle state persistence and event routing.
- Temporal Java SDK models sagas as durable workflows with automatic retry and compensation.
- Use a saga table in PostgreSQL to store step state; query it on restart to resume incomplete sagas.
- `@SagaOrchestrationStart` marks the initiating command; `@SagaEventHandler` reacts to participant replies.

### Example Structure
```java
// Axon-style saga
@Saga
class OrderFulfillmentSaga {
    private UUID orderId;
    private boolean inventoryReserved;

    @StartSaga
    @SagaEventHandler(associationProperty = "orderId")
    void on(OrderCreated event) {
        orderId = event.orderId();
        commandGateway.send(new ReserveInventoryCommand(orderId));
    }

    @SagaEventHandler(associationProperty = "orderId")
    void on(InventoryReserved event) {
        inventoryReserved = true;
        commandGateway.send(new ChargePaymentCommand(orderId));
    }

    @SagaEventHandler(associationProperty = "orderId")
    void on(PaymentFailed event) {
        if (inventoryReserved) commandGateway.send(new ReleaseInventoryCommand(orderId));
        SagaLifecycle.end();
    }
}
```

## Python

### Notes
- `choreography-based` sagas: services react to domain events published to Kafka/RabbitMQ.
- `orchestration-based`: a dedicated `SagaOrchestrator` class sends commands and awaits responses.
- Temporal Python SDK provides durable workflow execution with saga semantics.
- Use `compensations: list[Callable]` stack in the orchestrator; on failure, iterate and call each.

### Example Structure
```python
from typing import Callable

class OrderSaga:
    def __init__(self, inventory, payment) -> None:
        self._inventory = inventory
        self._payment = payment
        self._compensations: list[Callable] = []

    def execute(self, order_id: str) -> None:
        self._inventory.reserve(order_id)
        self._compensations.append(lambda: self._inventory.release(order_id))

        try:
            self._payment.charge(order_id)
            self._compensations.append(lambda: self._payment.refund(order_id))
        except Exception:
            self._rollback()
            raise

    def _rollback(self) -> None:
        for comp in reversed(self._compensations):
            try: comp()
            except Exception: pass  # log but continue compensating
```

## Rust

### Notes
- Saga state is a struct serialized to a database; each step advances the state and persists before proceeding.
- Use `async fn` for each saga step; `tokio` provides the async runtime.
- Temporal Rust SDK is in development; use `Kafka` + explicit state machine for now.
- Return `Result<(), SagaError>` and trigger compensation in the `Err` branch.

### Example Structure
```rust
use uuid::Uuid;

enum SagaStep { Start, InventoryReserved, PaymentCharged, Complete, Failed }

struct OrderSaga {
    order_id: Uuid,
    step: SagaStep,
}

impl OrderSaga {
    async fn execute(
        &mut self,
        inventory: &dyn InventoryService,
        payment: &dyn PaymentService,
        log: &dyn SagaLog,
    ) -> Result<(), SagaError> {
        inventory.reserve(self.order_id).await?;
        self.step = SagaStep::InventoryReserved;
        log.save(self).await?;

        if let Err(e) = payment.charge(self.order_id).await {
            inventory.release(self.order_id).await.ok(); // compensate
            self.step = SagaStep::Failed;
            log.save(self).await?;
            return Err(e.into());
        }
        self.step = SagaStep::Complete;
        log.save(self).await
    }
}
```

## TypeScript

### Notes
- Saga steps typed as `{ execute(ctx: T): Promise<void>; compensate(ctx: T): Promise<void> }` — generic over context type.
- Orchestration saga: a central async function drives steps; compensation runs in reverse on failure — `try/catch` models this naturally.
- Choreography saga: services communicate via events — use a typed event bus with discriminated union event types for exhaustiveness.
- Compensation is best-effort: wrap each `compensate()` in its own `try/catch` to prevent one failed rollback from blocking the rest.

### Example Structure
```typescript
interface SagaStep<TCtx> {
  execute(ctx: TCtx): Promise<void>;
  compensate(ctx: TCtx): Promise<void>;
}

async function runSaga<TCtx>(steps: SagaStep<TCtx>[], ctx: TCtx): Promise<void> {
  const completed: SagaStep<TCtx>[] = [];
  try {
    for (const step of steps) {
      await step.execute(ctx);
      completed.push(step);
    }
  } catch (err) {
    for (const step of [...completed].reverse()) {
      try { await step.compensate(ctx); }
      catch (compensateErr) { console.error('Compensation failed', compensateErr); }
    }
    throw new Error(`Saga failed: ${err}`);
  }
}

// Usage
type OrderCtx = { orderId: string; chargeId?: string; trackingNo?: string };
await runSaga<OrderCtx>([
  reserveInventoryStep,
  chargePaymentStep,
  scheduleShipmentStep,
], { orderId: 'ord-123' });
```
