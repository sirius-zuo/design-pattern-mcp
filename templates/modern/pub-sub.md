---
name: Pub/Sub
category: modern
aliases: [Publisher/Subscriber]
languages: [go, java, python, rust, generic]
triggers:
  - decouple producers from multiple consumers
  - fanout notifications
  - async inter-service communication
  - topic-based routing
---

## Overview
Decouples message producers (Publishers) from consumers (Subscribers) through a message broker or event bus. Publishers send messages to topics; subscribers receive messages from topics they are interested in, with no direct knowledge of each other.

## Components
- **Publisher**: Sends messages to a named topic. Unaware of subscribers.
- **Subscriber**: Registers interest in one or more topics. Receives messages asynchronously via callback or polling.
- **Message Broker / Event Bus**: Routes messages from publishers to all active subscribers of a topic. Provides durability, ordering, and delivery guarantees depending on the implementation.
- **Topic / Channel**: A named logical stream that groups related messages.
- **Message**: The payload published to a topic. Should be self-contained and versioned.

## Constraints
- Publishers must NOT know which (or how many) subscribers exist — complete decoupling.
- Subscribers must be idempotent — messages may be delivered more than once (at-least-once delivery is common).
- Message schema must be versioned; changing a message schema must not break existing subscribers.
- Do NOT use Pub/Sub when the publisher needs an immediate response — use request/response instead.

## Anti-Patterns
- Publisher waiting synchronously for all subscribers to process the message (defeats async decoupling).
- Subscribers assuming exactly-once delivery without deduplication logic.
- Topics with extremely broad semantics that many unrelated consumers subscribe to (creates hidden coupling).
- Publishing large binary payloads in messages — store data externally and publish a reference.

## Generic Example Structure
```
EventBus {
  subscriptions: map[Topic][]Subscriber

  subscribe(topic, handler): void {
    subscriptions[topic].append(handler)
  }

  publish(topic, msg): void {
    for handler in subscriptions[topic] {
      handler(msg)  // or enqueue for async delivery
    }
  }
}

// Publisher — no knowledge of subscribers
bus.publish("order.placed", OrderPlacedEvent{orderID: "123"})

// Subscriber — no knowledge of publishers
bus.subscribe("order.placed", func(msg) {
  sendConfirmationEmail(msg.orderID)
})
```

## Go

### Notes
- In-process: use a `map[string][]chan Event` or `sync.Map` keyed by topic; goroutines consume from channels.
- Out-of-process: use NATS, Kafka (confluent-kafka-go / segmentio/kafka-go), or Google Pub/Sub.
- Always close subscriber channels on shutdown to prevent goroutine leaks.
- Use `context.Context` for cancellation of subscriber goroutines.

### Example Structure
```go
type Message struct{ Topic string; Payload []byte }
type Handler func(msg Message)

type EventBus struct {
    mu   sync.RWMutex
    subs map[string][]Handler
}

func (b *EventBus) Subscribe(topic string, h Handler) {
    b.mu.Lock(); defer b.mu.Unlock()
    b.subs[topic] = append(b.subs[topic], h)
}

func (b *EventBus) Publish(msg Message) {
    b.mu.RLock(); defer b.mu.RUnlock()
    for _, h := range b.subs[msg.Topic] {
        go h(msg) // async delivery
    }
}
```

## Java

### Notes
- Spring's `ApplicationEventPublisher` / `@EventListener` provides in-process pub/sub.
- Kafka (Spring Kafka `@KafkaListener`) and RabbitMQ (Spring AMQP `@RabbitListener`) for out-of-process.
- Use `@Async` on `@EventListener` methods for non-blocking subscriber execution.
- Set `spring.kafka.consumer.enable-auto-commit=false` and commit offsets manually for at-least-once delivery with idempotent processing.

### Example Structure
```java
// Spring in-process event
public record OrderPlacedEvent(UUID orderId) {}

@Service
class OrderService {
    @Autowired ApplicationEventPublisher publisher;

    void placeOrder(UUID customerId) {
        // business logic
        publisher.publishEvent(new OrderPlacedEvent(UUID.randomUUID()));
    }
}

@Component
class NotificationService {
    @Async
    @EventListener
    void on(OrderPlacedEvent event) {
        // send confirmation email
    }
}
```

## Python

### Notes
- `blinker` signals provide lightweight in-process pub/sub for Python.
- Redis Pub/Sub and Kafka (`confluent-kafka`) cover out-of-process message passing.
- `asyncio.Queue` pairs well with pub/sub for in-process async fanout.
- Type-annotate message payloads with `dataclasses` to catch schema mismatches early.

### Example Structure
```python
from dataclasses import dataclass
from collections import defaultdict
from typing import Callable, Any
import asyncio

@dataclass
class Message:
    topic: str
    payload: Any

class AsyncEventBus:
    def __init__(self) -> None:
        self._subs: dict[str, list[Callable]] = defaultdict(list)

    def subscribe(self, topic: str, handler: Callable) -> None:
        self._subs[topic].append(handler)

    async def publish(self, msg: Message) -> None:
        handlers = self._subs.get(msg.topic, [])
        await asyncio.gather(*[h(msg) for h in handlers])
```

## Rust

### Notes
- `tokio::sync::broadcast` provides multi-consumer channels for in-process pub/sub.
- `tokio::sync::watch` is ideal for latest-value-only pub/sub (state broadcasting).
- For out-of-process: `rdkafka` (librdkafka bindings) or `lapin` (RabbitMQ AMQP).
- `broadcast::Sender::send` returns an error if there are no receivers — handle it explicitly.

### Example Structure
```rust
use tokio::sync::broadcast;

#[derive(Clone, Debug)]
struct OrderPlacedEvent { order_id: uuid::Uuid }

struct EventBus { tx: broadcast::Sender<OrderPlacedEvent> }

impl EventBus {
    pub fn new() -> (Self, broadcast::Receiver<OrderPlacedEvent>) {
        let (tx, rx) = broadcast::channel(1024);
        (Self { tx }, rx)
    }

    pub fn publish(&self, event: OrderPlacedEvent) {
        let _ = self.tx.send(event);
    }

    pub fn subscribe(&self) -> broadcast::Receiver<OrderPlacedEvent> {
        self.tx.subscribe()
    }
}
```
