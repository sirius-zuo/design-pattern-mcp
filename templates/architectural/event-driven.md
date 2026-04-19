---
name: Event-Driven Architecture
category: architectural
languages: [go, java, python, rust, typescript, generic]
triggers:
  - high scalability with loose coupling
  - async reaction to state changes
  - decouple services via events
  - reactive systems
  - audit trail of all state changes
---

## Overview
Structures communication around the production, detection, and consumption of events. Producers emit events when state changes without knowing who will handle them. Consumers subscribe to relevant events and react asynchronously. A message broker (Kafka, RabbitMQ, NATS) typically mediates delivery.

## Components
- **Event Producer**: Emits events when domain state changes (e.g., `OrderPlaced`, `UserRegistered`). Does not know about consumers.
- **Event**: An immutable record of something that happened. Contains enough data for consumers to act without querying back.
- **Message Broker**: Routes events from producers to consumers. Provides durability, delivery guarantees, and topic/queue management.
- **Event Consumer**: Subscribes to one or more event types and handles them. May emit further events.
- **Event Store** (optional): Append-only log of all events. Enables replay, auditing, and rebuilding state.

## Constraints
- Events must be immutable once published — never modify or delete a published event.
- Consumers must be idempotent: receiving the same event twice must not produce duplicate effects.
- Producers must NOT wait synchronously for consumer processing — fire and move on.
- Event schema changes must be backwards-compatible (add fields, never remove or rename without versioning).

## Anti-Patterns
- Consumers querying producers for additional data on every event (event should be self-contained).
- Synchronous event processing that blocks the producer thread (defeats async decoupling).
- Non-idempotent consumers that can cause double-processing on retry.
- Tight schema coupling: consumers deserializing every field of an event — use only the fields needed.

## Generic Example Structure
```
Producer                Broker (topic: orders)       Consumer
OrderService            ┌────────────────┐            InventoryService
  order.Place() →       │ OrderPlaced    │ →          onOrderPlaced(): reserve stock
  emit OrderPlaced      │ OrderCancelled │            EmailService
                        └────────────────┘            onOrderPlaced(): send confirmation
```

## Go

### Notes
- `confluent-kafka-go` or `segmentio/kafka-go` for Kafka; `nats.go` for NATS.
- Define events as structs; serialize with JSON or protobuf for the wire format.
- Implement consumers as goroutines with a poll loop; use `context.Context` for graceful shutdown.
- Idempotency: store processed event IDs in a deduplication table or use Kafka's exactly-once semantics.

### Example Structure
```go
// Event definition
type OrderPlacedEvent struct {
    EventID   string    `json:"event_id"`
    OrderID   string    `json:"order_id"`
    UserID    string    `json:"user_id"`
    OccurredAt time.Time `json:"occurred_at"`
}

// Producer
func (s *OrderService) PlaceOrder(ctx context.Context, req PlaceOrderRequest) (*Order, error) {
    order := domain.NewOrder(req)
    if err := s.repo.Save(ctx, order); err != nil { return nil, err }
    s.producer.Publish(ctx, "orders", OrderPlacedEvent{EventID: uuid.New().String(), OrderID: order.ID})
    return order, nil
}

// Consumer
func (c *InventoryConsumer) Run(ctx context.Context) {
    for msg := range c.sub.Messages("orders") {
        var evt OrderPlacedEvent
        json.Unmarshal(msg.Value, &evt)
        c.inventory.ReserveStock(ctx, evt.OrderID)
    }
}
```

## Java

### Notes
- Spring Kafka (`@KafkaListener`) or Spring AMQP (`@RabbitListener`) for consumer annotation-driven setup.
- Use Spring's `@Transactional` with outbox pattern to guarantee event publication is atomic with DB changes.
- Avro + Confluent Schema Registry for schema evolution and backwards compatibility enforcement.
- `@KafkaListener(topics = "orders", groupId = "inventory-service")` to partition consumer groups.

### Example Structure
```java
// Event
public record OrderPlacedEvent(String eventId, String orderId, String userId, Instant occurredAt) {}

// Producer (with Outbox pattern for atomicity)
@Service @Transactional
public class OrderService {
    public Order placeOrder(PlaceOrderRequest req) {
        Order order = orderRepository.save(Order.from(req));
        outboxRepository.save(new OutboxEvent("orders", new OrderPlacedEvent(UUID.randomUUID().toString(), order.getId(), req.getUserId(), Instant.now())));
        return order;
    }
}

// Consumer
@Component
public class InventoryConsumer {
    @KafkaListener(topics = "orders", groupId = "inventory-service")
    public void onOrderPlaced(OrderPlacedEvent event) {
        inventoryService.reserveStock(event.orderId());
    }
}
```

## Python

### Notes
- `confluent-kafka` or `aiokafka` for Kafka; `aio-pika` for RabbitMQ with async Python.
- Use `cloudevents` library for a standard event envelope format across services.
- Idempotency: maintain a `processed_events` set in Redis or a DB table keyed by `event_id`.
- `Celery` with a Redis/RabbitMQ broker for simpler task-queue-based event processing.

### Example Structure
```python
# Event dataclass
@dataclass
class OrderPlacedEvent:
    event_id: str
    order_id: str
    user_id: str
    occurred_at: datetime

# Producer
class OrderService:
    async def place_order(self, req: PlaceOrderRequest) -> Order:
        order = await self.repo.save(Order.from_request(req))
        await self.producer.publish("orders", OrderPlacedEvent(
            event_id=str(uuid4()), order_id=order.id,
            user_id=req.user_id, occurred_at=datetime.utcnow()
        ))
        return order

# Consumer
class InventoryConsumer:
    async def run(self):
        async for msg in self.consumer.subscribe("orders"):
            event = OrderPlacedEvent(**json.loads(msg.value))
            await self.inventory.reserve_stock(event.order_id)
```

## Rust

### Notes
- `rdkafka` for Kafka; `lapin` for AMQP/RabbitMQ; `async-nats` for NATS.
- Serialize events with `serde_json` or `prost` (protobuf); define event schema in a shared crate.
- Consumer loops use `tokio` tasks; spawn one task per partition for parallel processing.
- Use `sqlx` with a transaction to atomically save state and insert into an outbox table.

### Example Structure
```rust
// Event
#[derive(Serialize, Deserialize)]
pub struct OrderPlacedEvent {
    pub event_id: String,
    pub order_id: String,
    pub user_id: String,
    pub occurred_at: DateTime<Utc>,
}

// Producer
impl OrderService {
    pub async fn place_order(&self, req: PlaceOrderRequest) -> Result<Order> {
        let order = self.repo.save(Order::new(req)).await?;
        self.producer.publish("orders", &OrderPlacedEvent {
            event_id: Uuid::new_v4().to_string(),
            order_id: order.id.clone(),
            user_id: order.user_id.clone(),
            occurred_at: Utc::now(),
        }).await?;
        Ok(order)
    }
}

// Consumer (tokio task)
async fn consume_orders(consumer: Arc<Consumer>, inventory: Arc<InventoryService>) {
    while let Some(msg) = consumer.next_message("orders").await {
        let evt: OrderPlacedEvent = serde_json::from_slice(&msg.payload).unwrap();
        inventory.reserve_stock(&evt.order_id).await.unwrap();
    }
}
```

## TypeScript

### Notes
- Discriminated union event types (`type AppEvent = OrderPlaced | PaymentFailed | ShipmentCreated`) provide compile-time exhaustiveness.
- `eventemitter3` with typed `Events` map for in-process events; Kafka/NATS for distributed cross-service events.
- NestJS `@OnEvent('order.placed')` decorators + `EventEmitter2` for declarative subscriptions in service classes.
- Async handlers: use a bus that awaits `Promise.allSettled` to ensure all handlers complete before continuing.

### Example Structure
```typescript
// Discriminated union — exhaustiveness guaranteed by TypeScript
type AppEvent =
  | { type: 'OrderPlaced';    orderId: string; amount: number }
  | { type: 'PaymentFailed';  orderId: string; reason: string }
  | { type: 'ShipmentCreated'; orderId: string; trackingNo: string };

class TypedEventBus {
  private handlers = new Map<string, ((e: AppEvent) => Promise<void>)[]>();

  on<T extends AppEvent['type']>(
    type: T,
    fn: (e: Extract<AppEvent, { type: T }>) => Promise<void>,
  ): void {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(type, [...existing, fn as (e: AppEvent) => Promise<void>]);
  }

  async emit(event: AppEvent): Promise<void> {
    const fns = this.handlers.get(event.type) ?? [];
    await Promise.allSettled(fns.map(fn => fn(event)));
  }
}

const bus = new TypedEventBus();
bus.on('OrderPlaced', async ({ orderId, amount }) => {
  await inventoryService.reserve(orderId);
});
```
