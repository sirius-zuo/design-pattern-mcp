---
name: Event Sourcing
category: modern
languages: [go, java, python, rust, generic]
triggers:
  - full history of state changes required
  - audit log is business-critical
  - replay or reconstruct past state
  - derive current state from events
---

## Overview
Stores state changes as an immutable sequence of events rather than the current state. Current state is derived by replaying the event log. Enables full audit history, time-travel queries, and event-driven projections.

## Components
- **Event**: An immutable record of something that happened. Contains the aggregate ID, event type, timestamp, and payload. Never deleted.
- **Aggregate**: The domain object whose state is rebuilt by replaying its events. Applies events via `apply(event)`.
- **Event Store**: Append-only storage for events. Supports loading events by aggregate ID and subscribing to new events.
- **Projection / Read Model**: Subscribes to the event stream and builds a denormalized view optimized for queries.
- **Command Handler**: Validates a command, loads the aggregate, executes business logic, and appends resulting events.

## Constraints
- Events must be immutable after appending — never update or delete stored events.
- Aggregate state must be derived ONLY from replaying its events — no direct state mutation from outside.
- Events must represent business facts (past tense: `OrderPlaced`, `PaymentFailed`), not technical operations.
- Projections must be idempotent — replaying the same event twice must produce the same read model.

## Anti-Patterns
- Storing commands or intent as events instead of the resulting business fact.
- Mutating event payloads after storage (breaks immutability; use event versioning/upcasting instead).
- Loading all historical events on every request for high-volume aggregates (use snapshots beyond a threshold).
- Projections that call external services during rebuild — they introduce non-determinism.

## Generic Example Structure
```
Event {
  aggregateID: UUID
  type: string
  payload: JSON
  timestamp: time
  version: int
}

Aggregate {
  id: UUID
  version: int
  pendingEvents: []Event

  apply(event: Event): void    // updates in-memory state
  raise(event: Event): void {  // records pending event + applies
    pendingEvents.append(event)
    apply(event)
  }

  static reconstitute(events: []Event): Aggregate {
    agg = new Aggregate()
    for e in events { agg.apply(e) }
    return agg
  }
}

EventStore {
  append(aggregateID, events, expectedVersion): void
  load(aggregateID): []Event
}
```

## Go

### Notes
- Define events as typed structs (not stringly-typed maps) for compile-time safety.
- Use a `switch` or a `map[string]func(*Aggregate, Event)` handler for event dispatch in `Apply()`.
- Snapshots: persist aggregate state at version N; on load, start from the nearest snapshot + subsequent events.
- `EventStoreDB` or PostgreSQL `JSONB` are common Go event store backends.

### Example Structure
```go
type Event struct {
    AggregateID uuid.UUID
    Type        string
    Payload     json.RawMessage
    Version     int
    OccurredAt  time.Time
}

type Order struct {
    ID     uuid.UUID
    Status string
    Version int
    pending []Event
}

func (o *Order) Place(id uuid.UUID) {
    o.raise(Event{AggregateID: id, Type: "OrderPlaced"})
}

func (o *Order) apply(e Event) {
    switch e.Type {
    case "OrderPlaced": o.ID = e.AggregateID; o.Status = "placed"
    }
    o.Version = e.Version
}

func (o *Order) raise(e Event) { e.Version = o.Version + 1; o.pending = append(o.pending, e); o.apply(e) }
```

## Java

### Notes
- Axon Framework provides a full event sourcing + CQRS implementation for Java/Spring.
- Annotate aggregate event handlers with `@EventSourcingHandler` (Axon) or implement a manual dispatch method.
- Store events as serialized JSON in PostgreSQL or a dedicated event store (EventStoreDB).
- Use `@Aggregate` + `@CommandHandler` + `@EventSourcingHandler` for the complete Axon pattern.

### Example Structure
```java
// Domain event
public record OrderPlaced(UUID orderId, String customerId, Instant occurredAt) {}

// Aggregate
public class Order {
    private UUID id;
    private String status;
    private final List<Object> pendingEvents = new ArrayList<>();

    public void place(UUID id) {
        var event = new OrderPlaced(id, "cust-1", Instant.now());
        pendingEvents.add(event);
        apply(event);
    }

    private void apply(OrderPlaced e) { this.id = e.orderId(); this.status = "placed"; }

    public static Order reconstitute(List<Object> events) {
        var o = new Order();
        events.forEach(e -> { if (e instanceof OrderPlaced p) o.apply(p); });
        return o;
    }
}
```

## Python

### Notes
- Use `dataclasses(frozen=True)` for immutable event objects with timestamp fields.
- `eventsourcing` library provides a full Python event sourcing framework.
- Type-dispatch `apply()` with `isinstance` checks or a `singledispatch` registry for each event type.
- Store events as JSONB in PostgreSQL or use SQLite for development; ensure the events table is append-only.

### Example Structure
```python
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

@dataclass(frozen=True)
class OrderPlaced:
    order_id: UUID
    customer_id: str
    occurred_at: datetime

class Order:
    def __init__(self) -> None:
        self.id: UUID | None = None
        self.status = ""
        self.version = 0
        self._pending: list = []

    def place(self, order_id: UUID) -> None:
        event = OrderPlaced(order_id, "cust-1", datetime.utcnow())
        self._pending.append(event)
        self._apply(event)

    def _apply(self, event: object) -> None:
        if isinstance(event, OrderPlaced):
            self.id = event.order_id; self.status = "placed"
        self.version += 1
```

## Rust

### Notes
- Use a `sealed` enum for event variants to get exhaustive `match` in `apply()`.
- `serde` + JSON/MessagePack serialization stores events; deserialize with `serde_json::from_value`.
- Event versioning: add a `version: u32` field to events; implement upcasters for schema migrations.
- `EventStoreDB` has an official Rust gRPC client for production event stores.

### Example Structure
```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone)]
enum OrderEvent {
    Placed { order_id: Uuid, customer_id: String },
    Shipped { tracking_number: String },
}

struct Order { pub id: Option<Uuid>, pub status: String, pub version: u32 }

impl Order {
    pub fn apply(&mut self, event: &OrderEvent) {
        match event {
            OrderEvent::Placed { order_id, .. } => { self.id = Some(*order_id); self.status = "placed".into(); }
            OrderEvent::Shipped { .. } => { self.status = "shipped".into(); }
        }
        self.version += 1;
    }

    pub fn reconstitute(events: &[OrderEvent]) -> Self {
        let mut o = Order { id: None, status: String::new(), version: 0 };
        for e in events { o.apply(e); }
        o
    }
}
```
