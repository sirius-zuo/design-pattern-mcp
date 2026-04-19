---
name: Dependency Injection
category: modern
aliases: [DI]
languages: [go, java, python, rust, typescript, generic]
triggers:
  - decouple components from dependency creation
  - hard to test because new Dependency inside logic
  - swap real vs mock in tests
  - inversion of control
---

## Overview
A technique where an object receives its dependencies from an external source rather than creating them itself. Inverts the control of dependency creation, enabling loose coupling and testability.

## Components
- **Service** (interface): The abstraction a consumer depends on. Enables substitution of implementations.
- **ConcreteService**: The production implementation of the Service interface.
- **Consumer**: Declares its dependencies via constructor (preferred), method, or field. Never instantiates dependencies itself.
- **Injector / Container**: Creates and wires the dependency graph. May be a DI framework or explicit wiring in `main()`.

## Constraints
- Consumer must NOT use `new ConcreteService()` or a service locator inside its own logic.
- Prefer constructor injection over field injection — dependencies are explicit, the object is valid on construction.
- The Consumer's constructor must accept the Service interface, not the concrete type.
- Injector / container wiring must be confined to the composition root (application startup) — not scattered across the codebase.

## Anti-Patterns
- Service Locator pattern (hidden dependency lookup) — it hides dependencies and makes testing hard.
- Field injection (`@Autowired` on fields) — bypasses the constructor, making required dependencies invisible.
- Passing the DI container into domain objects so they pull dependencies themselves.
- Constructor over-injection — more than 4-5 dependencies signals the class needs decomposition.

## Generic Example Structure
```
interface EmailService {
  send(to: string, body: string): void
}

UserService {
  emailSvc: EmailService  // injected — not created here

  constructor(emailSvc: EmailService) {
    self.emailSvc = emailSvc
  }

  registerUser(email: string): void {
    // business logic
    emailSvc.send(email, "Welcome!")
  }
}

// Composition root (main / bootstrap)
emailSvc := SMTPEmailService{host: "smtp.example.com"}
userSvc  := UserService{emailSvc: emailSvc}
```

## Go

### Notes
- Constructor injection is the idiomatic Go approach: `func NewUserService(e EmailService) *UserService`.
- Go has no DI framework in the standard library; `google/wire` generates compile-time wiring code.
- Interfaces should be defined in the consuming package, not the providing package (accept interfaces, return structs).
- Avoid global variables as a substitute for injection — they make tests non-deterministic.

### Example Structure
```go
// Consumer defines the interface it needs
type EmailService interface{ Send(to, body string) error }

type UserService struct{ emailSvc EmailService }

// Constructor injection
func NewUserService(e EmailService) *UserService { return &UserService{emailSvc: e} }

func (s *UserService) Register(email string) error {
    // business logic
    return s.emailSvc.Send(email, "Welcome!")
}

// Composition root (main.go)
// smtp := NewSMTPEmailService("smtp.example.com")
// svc  := NewUserService(smtp)
```

## Java

### Notes
- Spring's `@Component` + `@Autowired` constructor injection is the most common Java DI pattern.
- Prefer `final` fields + constructor injection over `@Autowired` on fields (immutability + testability).
- Guice and Dagger are non-Spring DI alternatives; Dagger generates code at compile time.
- In tests, inject stubs or `Mockito.mock(EmailService.class)` directly into the constructor.

### Example Structure
```java
interface EmailService { void send(String to, String body); }

@Service
class UserService {
    private final EmailService emailService;

    @Autowired // constructor injection — preferred
    UserService(EmailService emailService) {
        this.emailService = emailService;
    }

    public void register(String email) {
        // business logic
        emailService.send(email, "Welcome!");
    }
}

// SMTP implementation annotated @Service or wired via @Configuration
```

## Python

### Notes
- Constructor injection is idiomatic; type-annotate parameters with the Protocol/ABC for documentation.
- `dependency_injector` and `injector` are popular Python DI frameworks for larger codebases.
- FastAPI uses `Depends()` for function-level dependency injection in route handlers.
- For tests, pass a fake or mock directly to the constructor — no DI framework needed.

### Example Structure
```python
from typing import Protocol

class EmailService(Protocol):
    def send(self, to: str, body: str) -> None: ...

class UserService:
    def __init__(self, email_service: EmailService) -> None:
        self._email_service = email_service  # injected

    def register(self, email: str) -> None:
        # business logic
        self._email_service.send(email, "Welcome!")

# Composition root
# from infrastructure.smtp import SMTPEmailService
# svc = UserService(SMTPEmailService(host="smtp.example.com"))
```

## Rust

### Notes
- Constructor injection is the only idiomatic form: `fn new(dep: impl ServiceTrait) -> Self`.
- Trait objects (`Box<dyn Service>`) enable runtime polymorphism for injected dependencies.
- The `shaku` crate provides a compile-time DI container; for most cases, manual wiring suffices.
- Mark injected fields as `Arc<dyn Service>` when the dependency is shared across threads.

### Example Structure
```rust
trait EmailService: Send + Sync {
    fn send(&self, to: &str, body: &str) -> Result<(), String>;
}

struct UserService { email_svc: Arc<dyn EmailService> }

impl UserService {
    pub fn new(email_svc: Arc<dyn EmailService>) -> Self { Self { email_svc } }

    pub fn register(&self, email: &str) -> Result<(), String> {
        // business logic
        self.email_svc.send(email, "Welcome!")
    }
}

// Composition root (main.rs)
// let smtp = Arc::new(SmtpEmailService::new("smtp.example.com"));
// let svc  = UserService::new(smtp);
```

## TypeScript

### Notes
- NestJS `@Injectable()` + constructor injection is the standard for TypeScript server apps; the DI container manages lifetimes.
- InversifyJS for non-framework DI — `@injectable()` + `@inject(TOKEN)` decorators; requires `reflect-metadata`.
- Constructor injection is preferred over property injection for testability and explicit dependency declaration.
- `tsyringe` (Microsoft, lightweight) for TypeScript DI without a full framework.

### Example Structure
```typescript
// NestJS (most common for TypeScript servers)
@Injectable()
class UserRepository {
  constructor(@InjectRepository(UserEntity) private repo: Repository<UserEntity>) {}
  async findById(id: string): Promise<UserEntity | null> { return this.repo.findOneBy({ id }); }
}

@Injectable()
class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly mailer: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<UserEntity> {
    const user = this.userRepo.create(dto);
    await this.userRepo.save(user);
    await this.mailer.sendWelcome(user.email);
    return user;
  }
}

// Framework-agnostic constructor injection (no decorators)
class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,      // interface, not class
    private readonly paymentGateway: PaymentGateway,  // interface, not class
  ) {}
}
```
