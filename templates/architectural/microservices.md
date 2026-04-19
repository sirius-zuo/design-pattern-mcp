---
name: Microservices
category: architectural
languages: [go, java, python, rust, typescript, generic]
triggers:
  - independent deployability for different parts
  - different scaling requirements per capability
  - separate teams owning separate services
  - reduce blast radius of failures to individual services
  - polyglot technology choices per service
---

## Overview
Structures an application as a collection of small, independently deployable services, each owning its own data store and communicating over well-defined network APIs (REST, gRPC, or messaging). Each service is responsible for a single bounded context.

## Components
- **Service**: Independently deployable unit implementing one bounded context. Has its own data store; no direct database sharing with other services.
- **API Gateway**: Single entry point for external clients. Handles routing, auth, rate limiting, and protocol translation.
- **Service Registry / Discovery**: Enables services to locate each other by name rather than hard-coded addresses (e.g., Consul, Kubernetes DNS).
- **Message Broker** (optional): Enables async communication between services (Kafka, RabbitMQ, NATS). Decouples producer from consumer.
- **Circuit Breaker**: Wraps outbound calls to other services. Prevents cascading failures when a dependency is unhealthy.

## Constraints
- Services must NOT share a database — each service owns its data exclusively.
- Inter-service communication must go through published APIs or events, never direct DB access.
- Each service must be independently buildable, testable, and deployable without co-deploying other services.
- Service interfaces (API contracts) must be versioned and backwards-compatible to allow independent deployment.

## Anti-Patterns
- Shared database between services (creates deployment coupling and breaks service autonomy).
- Distributed monolith: services that must be deployed together because of tight synchronous coupling.
- Chatty communication: many fine-grained synchronous calls between services for a single user request (prefer coarser APIs or async events).
- Skipping the API Gateway and exposing every service directly to external clients.

## Generic Example Structure
```
Client → API Gateway
  → UserService      (owns users DB)
  → OrderService     (owns orders DB)
  → InventoryService (owns inventory DB)

OrderService → (async event: OrderPlaced) → InventoryService
OrderService → (sync gRPC) → PaymentService
```

## Go

### Notes
- Each microservice is its own Go module and binary; share only generated protobuf types, not business code.
- Use `net/http` or a lightweight router (Chi, Fiber) per service; gRPC for service-to-service calls.
- `go-kit` or `grpc-gateway` for larger services needing middleware, observability, and transport abstraction.
- Instrument each service with structured logging (`slog`), metrics (Prometheus), and distributed tracing (OpenTelemetry).

### Example Structure
```go
// order-service/main.go — standalone binary
func main() {
    repo := postgres.NewOrderRepo(mustConnectDB())
    svc  := order.NewService(repo, events.NewKafkaPublisher())
    h    := http.NewOrderHandler(svc)

    srv := &http.Server{Addr: ":8080", Handler: h.Router()}
    log.Fatal(srv.ListenAndServe())
}

// Async event publishing
type OrderService struct { repo OrderRepository; events EventPublisher }
func (s *OrderService) PlaceOrder(ctx context.Context, req PlaceOrderRequest) (*Order, error) {
    order := domain.NewOrder(req)
    if err := s.repo.Save(ctx, order); err != nil { return nil, err }
    s.events.Publish(ctx, OrderPlacedEvent{OrderID: order.ID})
    return order, nil
}
```

## Java

### Notes
- Spring Boot per service; Spring Cloud for service discovery (Eureka), config server, and circuit breaking (Resilience4j).
- Use OpenAPI/Swagger to document each service's API contract; generate client SDKs from specs.
- gRPC (with `grpc-spring-boot-starter`) for internal service calls where performance matters.
- Each service has its own `application.yml`, Docker image, and deployment manifest.

### Example Structure
```java
// order-service/OrderController.java
@RestController @RequestMapping("/orders")
public class OrderController {
    @Autowired private OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderDTO> placeOrder(@RequestBody PlaceOrderRequest req) {
        return ResponseEntity.ok(orderService.placeOrder(req));
    }
}

// Feign client calling inventory-service
@FeignClient(name = "inventory-service")
public interface InventoryClient {
    @GetMapping("/inventory/{productId}")
    InventoryDTO checkInventory(@PathVariable String productId);
}
```

## Python

### Notes
- FastAPI per service — lightweight, async-native, generates OpenAPI docs automatically.
- `httpx` for async inter-service HTTP calls; add Resilience4py or `tenacity` for retry/circuit-breaking.
- Use Celery + Redis/RabbitMQ for async task queues between services.
- Containerize each service with Docker; use `docker-compose` for local dev and Kubernetes for production.

### Example Structure
```python
# order_service/main.py
from fastapi import FastAPI
from .routes import router
from .database import engine

app = FastAPI()
app.include_router(router)

# order_service/routes.py
@router.post("/orders", response_model=OrderDTO)
async def place_order(req: PlaceOrderRequest, svc: OrderService = Depends()):
    return await svc.place_order(req)

# inventory_client.py — async HTTP client for inventory-service
async def check_inventory(product_id: str) -> InventoryDTO:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://inventory-service/inventory/{product_id}")
        resp.raise_for_status()
        return InventoryDTO(**resp.json())
```

## Rust

### Notes
- Axum or Actix-Web per service — both support async, middleware, and structured routing.
- Use `tonic` for gRPC inter-service communication; generate client/server stubs from `.proto` files.
- `rdkafka` for Kafka integration; `lapin` for RabbitMQ/AMQP.
- Each service is a separate Cargo workspace member or repo with its own `Dockerfile`.

### Example Structure
```rust
// order-service/src/main.rs
#[tokio::main]
async fn main() {
    let pool = PgPool::connect(&env::var("DATABASE_URL").unwrap()).await.unwrap();
    let repo = Arc::new(PostgresOrderRepo::new(pool));
    let svc  = Arc::new(OrderService::new(repo, KafkaEventPublisher::new()));
    let app  = Router::new()
        .route("/orders", post(handlers::place_order))
        .with_state(svc);
    axum::Server::bind(&"0.0.0.0:8080".parse().unwrap())
        .serve(app.into_make_service()).await.unwrap();
}
```

## TypeScript

### Notes
- Each microservice is its own Node.js process with its own `package.json`; share only generated protobuf types or OpenAPI client SDKs, not business code.
- NestJS per service — `@nestjs/microservices` for gRPC, TCP, NATS, Kafka transport between services.
- `axios` or `fetch` for inter-service HTTP; `@nestjs/microservices` `ClientProxy` for typed RPC.
- Instrument each service with structured logging (`pino`), metrics (`prom-client`), and tracing (OpenTelemetry `@opentelemetry/sdk-node`).

### Example Structure
```typescript
// order-service/src/main.ts — standalone NestJS app
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3001);
}
bootstrap();

// order-service/src/order.service.ts
@Injectable()
class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    @Inject(INVENTORY_CLIENT) private readonly inventory: ClientProxy,
  ) {}

  async placeOrder(dto: PlaceOrderDto): Promise<Order> {
    const order = Order.create(dto.customerId, dto.items);
    await lastValueFrom(this.inventory.send('reserve', { items: dto.items }));
    await this.orderRepo.save(order);
    return order;
  }
}
```
