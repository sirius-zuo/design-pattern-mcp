---
name: CQRS
category: modern
aliases: [Command Query Responsibility Segregation]
languages: [go, java, python, rust, generic]
triggers:
  - read and write workloads have different scaling needs
  - complex domain writes with many simple read views
  - separate command and query models
---

## Overview
Separates the write model (Commands that change state) from the read model (Queries that return data). Each side can be optimized, scaled, and evolved independently. Often combined with Event Sourcing.

## Components
- **Command**: An intent to change state. Contains only the data needed for the mutation. Named in imperative form (PlaceOrder, CancelShipment).
- **CommandHandler**: Validates and processes one Command type; loads the aggregate, applies business logic, persists changes.
- **Query**: A request for data. Must NOT produce side effects. Named in interrogative form (GetOrderById, ListActiveOrders).
- **QueryHandler**: Reads from the read model (denormalized, optimized view); returns a DTO. Never touches the write model.
- **Read Model / Projection**: A denormalized view updated asynchronously from domain events or synchronously after writes.

## Constraints
- Command handlers must NOT return domain data (only success/failure); queries must NOT mutate state.
- Read models are allowed to be eventually consistent with the write model — document the consistency guarantee.
- Query handlers must read from the read model only, NEVER from the write model (aggregate store).
- Command and Query models must NOT share the same database table or ORM entity.

## Anti-Patterns
- CommandHandlers that return rich domain objects (collapses command and query responsibilities).
- Queries that trigger side effects or touch the write store.
- Using CQRS for simple CRUD apps where one unified model suffices — adds complexity without benefit.
- Synchronously building the read model inside the command transaction (defeats eventual consistency purpose).

## Generic Example Structure
```
// Write side
Command: PlaceOrderCommand { customerID, items }
CommandHandler {
  handle(cmd: PlaceOrderCommand): CommandResult {
    order = Order.place(cmd.customerID, cmd.items)
    writeStore.save(order)
    eventBus.publish(order.pendingEvents)
    return CommandResult.ok(order.id)
  }
}

// Read side
Query: GetOrderQuery { orderID }
QueryHandler {
  handle(q: GetOrderQuery): OrderSummaryDTO {
    return readStore.findOrderSummary(q.orderID)
  }
}

// Projection updates read store on events
Projection {
  on(OrderPlaced e): void {
    readStore.upsert(OrderSummary{id: e.orderID, status: "placed"})
  }
}
```

## Go

### Notes
- Define `Command` and `Query` as plain structs; handlers are structs with a single `Handle()` method.
- Use separate database schemas or databases for write and read stores.
- Command bus: a `map[reflect.Type]CommandHandler` dispatches commands to their handlers.
- Read models stored in Redis or PostgreSQL materialized views work well for high-read scenarios.

### Example Structure
```go
// Write side
type PlaceOrderCommand struct { CustomerID uuid.UUID; Items []Item }
type PlaceOrderHandler struct { repo OrderRepository; events EventBus }
func (h *PlaceOrderHandler) Handle(cmd PlaceOrderCommand) (uuid.UUID, error) {
    order := NewOrder(cmd.CustomerID, cmd.Items)
    if err := h.repo.Save(order); err != nil { return uuid.Nil, err }
    h.events.Publish(order.PendingEvents())
    return order.ID, nil
}

// Read side
type GetOrderQuery struct { OrderID uuid.UUID }
type OrderSummaryDTO struct { ID uuid.UUID; Status string; Total float64 }
type GetOrderHandler struct { db ReadDB }
func (h *GetOrderHandler) Handle(q GetOrderQuery) (*OrderSummaryDTO, error) {
    return h.db.FindOrderSummary(q.OrderID)
}
```

## Java

### Notes
- Axon Framework provides `@CommandHandler` and `@QueryHandler` annotations with a message bus.
- MediatR-style libraries (Spring + a custom bus) dispatch commands and queries to handlers.
- Use `CompletableFuture` for async command handling; queries can be synchronous.
- Read models stored as Spring Data projections or custom SQL views keep query performance high.

### Example Structure
```java
// Command
public record PlaceOrderCommand(UUID customerId, List<Item> items) {}

// Command handler
@Service
class PlaceOrderHandler {
    @CommandHandler
    UUID handle(PlaceOrderCommand cmd) {
        Order order = Order.place(cmd.customerId(), cmd.items());
        orderRepository.save(order);
        eventPublisher.publishAll(order.pendingEvents());
        return order.getId();
    }
}

// Query + DTO
public record GetOrderQuery(UUID orderId) {}
public record OrderSummaryDTO(UUID id, String status, BigDecimal total) {}

@Service
class GetOrderHandler {
    @QueryHandler
    OrderSummaryDTO handle(GetOrderQuery query) {
        return readDb.findOrderSummary(query.orderId());
    }
}
```

## Python

### Notes
- Python's `dataclasses` work well for Commands and Queries — they are immutable value objects.
- A simple `dict[type, Callable]` dispatch table is a lightweight command/query bus.
- `mediatr` or custom mediator pattern handles dispatch in larger Python apps.
- Separate SQLAlchemy sessions for write and read models enforce the boundary in practice.

### Example Structure
```python
from dataclasses import dataclass
from uuid import UUID

# Commands
@dataclass(frozen=True)
class PlaceOrderCommand:
    customer_id: UUID
    items: list

# Command handler
class PlaceOrderHandler:
    def __init__(self, repo, event_bus) -> None:
        self._repo, self._bus = repo, event_bus

    def handle(self, cmd: PlaceOrderCommand) -> UUID:
        order = Order.place(cmd.customer_id, cmd.items)
        self._repo.save(order)
        self._bus.publish(order.pending_events)
        return order.id

# Queries
@dataclass(frozen=True)
class GetOrderQuery:
    order_id: UUID

class GetOrderHandler:
    def handle(self, query: GetOrderQuery) -> dict:
        return self._read_db.find_order_summary(query.order_id)
```

## Rust

### Notes
- Define Command and Query as enums or separate structs; handler traits dispatch on them.
- Axum / Actix-Web route handlers map cleanly to CQRS: POST/PUT routes call command handlers; GET routes call query handlers.
- Use separate database connection pools for write and read stores.
- `async fn handle` is idiomatic for handlers in an async runtime.

### Example Structure
```rust
use uuid::Uuid;

// Commands
pub struct PlaceOrderCommand { pub customer_id: Uuid, pub items: Vec<Item> }

pub trait CommandHandler<C> {
    type Output;
    async fn handle(&self, cmd: C) -> Result<Self::Output, Error>;
}

// Queries
pub struct GetOrderQuery { pub order_id: Uuid }

pub trait QueryHandler<Q> {
    type Output;
    async fn handle(&self, query: Q) -> Result<Self::Output, Error>;
}

pub struct OrderSummaryDto { pub id: Uuid, pub status: String }
```
