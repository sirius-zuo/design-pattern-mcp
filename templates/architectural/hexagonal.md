---
name: Hexagonal Architecture
category: architectural
aliases: [Ports and Adapters]
languages: [go, java, python, rust, typescript, generic]
triggers:
  - domain must be independent of infrastructure
  - swap databases or transport without changing domain
  - domain tests without real database
  - infrastructure concerns should not leak into business logic
  - multiple delivery mechanisms for same domain logic
---

## Overview
Organizes the application into a Domain core surrounded by Ports (interfaces) and Adapters (implementations). The Domain defines what it needs through Ports; Adapters implement those Ports using real infrastructure (databases, HTTP, message queues).

## Components
- **Domain**: Pure business logic and entities. No imports from infrastructure or framework packages. Defines Port interfaces.
- **Port (inbound)**: Interface through which external actors (HTTP, CLI, tests) drive the application. Implemented by Application Services.
- **Port (outbound)**: Interface the Domain uses to reach infrastructure (DB, email, queue). Defined in the Domain layer.
- **Adapter (inbound)**: Translates external input (HTTP request, CLI args) into domain calls. Examples: REST controller, CLI handler.
- **Adapter (outbound)**: Implements outbound Ports using real infrastructure. Examples: SQL repository, SMTP email sender.

## Constraints
- Domain must NOT import any adapter, framework, or infrastructure package.
- All dependency arrows must point inward — adapters depend on domain, never the reverse.
- Outbound Ports must be defined in the Domain layer, not in the adapter layer.
- Application Services (inbound adapters) must translate between external DTOs and domain objects at the boundary.

## Anti-Patterns
- Domain entities importing ORM annotations or HTTP status codes (infrastructure leaking in).
- Outbound Port interfaces defined in the adapter package (inverts the dependency direction).
- Skipping the Port abstraction and calling adapters directly from Domain code.
- Fat Application Services that contain domain logic instead of delegating to domain objects.

## Generic Example Structure
```
Domain/
  UserRepository (Port — interface)
  User           (Entity)
  UserService    (Application Service — implements inbound Port)

Adapters/
  PostgresUserRepository implements UserRepository (outbound adapter)
  HttpUserHandler          uses UserService         (inbound adapter)
  InMemoryUserRepository   implements UserRepository (test adapter)
```

## Go

### Notes
- Define outbound Port interfaces in the domain package: `type UserRepository interface { ... }`.
- Adapters live in separate packages (`adapters/postgres`, `adapters/http`) and import domain.
- Use constructor injection to wire adapters into domain services: `NewUserService(repo UserRepository)`.
- For testing: implement the Port interface with an in-memory struct — no mocking framework needed.

### Example Structure
```go
// domain/user.go
type UserRepository interface {
    FindByID(id string) (*User, error)
    Save(u *User) error
}

type UserService struct { repo UserRepository }
func NewUserService(r UserRepository) *UserService { return &UserService{repo: r} }
func (s *UserService) Register(name string) (*User, error) { /* domain logic */ }

// adapters/postgres/user_repo.go
type PostgresUserRepo struct { db *sql.DB }
func (r *PostgresUserRepo) FindByID(id string) (*User, error) { /* SQL */ }
func (r *PostgresUserRepo) Save(u *domain.User) error          { /* SQL */ }
```

## Java

### Notes
- Use interfaces in the domain package for outbound ports: `UserRepository`, `EmailSender`.
- Spring DI wires adapters to ports — domain services receive interfaces, not Spring annotations.
- Inbound adapters (`@RestController`) translate HTTP requests to domain calls; they import domain, not vice versa.
- Test with a `FakeUserRepository implements UserRepository` — no Spring context or database required.

### Example Structure
```java
// domain/UserRepository.java (Port — lives in domain)
public interface UserRepository {
    Optional<User> findById(String id);
    void save(User user);
}

// domain/UserService.java (Application Service)
public class UserService {
    private final UserRepository repo;
    public UserService(UserRepository repo) { this.repo = repo; }
    public User register(String name) { /* domain logic */ }
}

// adapters/JpaUserRepository.java (Adapter)
@Repository
public class JpaUserRepository implements UserRepository { /* JPA impl */ }
```

## Python

### Notes
- Define abstract base classes (or `Protocol`) for outbound ports in the domain layer.
- Adapters are concrete implementations injected at application startup.
- `dataclasses` or plain classes are suitable for domain entities — avoid ORM model inheritance in the domain.
- FastAPI/Flask live in the inbound adapter layer; domain services are plain Python classes.

### Example Structure
```python
# domain/ports.py
from typing import Protocol

class UserRepository(Protocol):
    def find_by_id(self, user_id: str) -> "User | None": ...
    def save(self, user: "User") -> None: ...

# domain/user_service.py
class UserService:
    def __init__(self, repo: UserRepository) -> None:
        self._repo = repo
    def register(self, name: str) -> "User":
        user = User(name=name)
        self._repo.save(user)
        return user

# adapters/sqlalchemy_user_repo.py
class SqlAlchemyUserRepository:
    def find_by_id(self, user_id: str): ...
    def save(self, user): ...
```

## Rust

### Notes
- Define outbound Port traits in the domain crate; adapter crates depend on domain, not the reverse.
- Use `Arc<dyn PortTrait>` for runtime dispatch (allows swapping adapters) or generics for zero-cost static dispatch.
- Workspace layout: `domain/`, `adapters/postgres/`, `adapters/http/`, `app/` (wiring).
- Tests in the domain crate use in-memory adapter structs implementing the trait.

### Example Structure
```rust
// domain/src/ports.rs
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<Option<User>, Error>;
    async fn save(&self, user: &User) -> Result<(), Error>;
}

// domain/src/user_service.rs
pub struct UserService { repo: Arc<dyn UserRepository> }
impl UserService {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self { Self { repo } }
    pub async fn register(&self, name: &str) -> Result<User, Error> { /* domain */ }
}

// adapters/postgres/src/lib.rs
pub struct PostgresUserRepo { pool: PgPool }
#[async_trait]
impl UserRepository for PostgresUserRepo { /* SQL impl */ }
```

## TypeScript

### Notes
- Port interfaces defined with TypeScript `interface` in the domain layer — adapters implement via structural typing, no `implements` required.
- NestJS modules wire adapters to ports: domain module exports the port interface; infrastructure module provides the adapter implementation.
- `@Injectable()` adapters registered with NestJS DI using custom provider tokens: `{ provide: NOTIFICATION_PORT, useClass: SendGridAdapter }`.
- Constructor injection of port interfaces in application services keeps domain code entirely free of framework dependencies.

### Example Structure
```typescript
// Port (domain layer — pure TypeScript, no framework imports)
interface NotificationPort {
  send(userId: string, message: string): Promise<void>;
}

// Application service (depends only on ports)
class UserRegistrationService {
  constructor(
    private readonly userRepo: UserRepository,   // port
    private readonly notify:   NotificationPort, // port
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const user = User.create(dto.email, dto.name);
    await this.userRepo.save(user);
    await this.notify.send(user.id, `Welcome, ${user.name}!`);
    return user;
  }
}

// Adapter (infrastructure layer — depends on external SDK)
class SendGridAdapter implements NotificationPort {
  constructor(private client: SendGridClient) {}
  async send(userId: string, message: string): Promise<void> {
    await this.client.send({ to: userId, subject: 'Welcome', text: message });
  }
}
// NestJS wiring: { provide: NOTIFICATION_PORT, useClass: SendGridAdapter }
```
