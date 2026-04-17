---
name: Clean Architecture
category: architectural
languages: [go, java, python, rust, generic]
triggers:
  - business rules must be independent of frameworks
  - strict inward-only dependency rule
  - long-lived system surviving technology changes
  - enterprise application with complex domain logic
  - keep core logic testable without spinning up infrastructure
---

## Overview
Organizes code into concentric layers (Entities, Use Cases, Interface Adapters, Frameworks & Drivers) where dependencies only point inward. The innermost layer (Entities) has zero knowledge of the outer layers.

## Components
- **Entities**: Enterprise-wide business rules and domain objects. No framework imports. Stable; changes only when fundamental business rules change.
- **Use Cases (Interactors)**: Application-specific business rules. Orchestrate Entities to fulfill one use case. Define input/output port interfaces.
- **Interface Adapters**: Convert data between Use Case format and external format. Controllers, Presenters, Gateways (Repository implementations) live here.
- **Frameworks & Drivers**: Outermost layer — databases, web frameworks, UI, external APIs. Plug into Interface Adapters; never referenced by inner layers.

## Constraints
- Each layer may only import from layers further inward — never outward.
- Use Cases must define their own input/output data structures (not reuse Entity or framework types directly).
- Entities must have no framework, ORM, or infrastructure imports.
- Repository interfaces are defined in the Use Case layer; implementations live in Interface Adapters.

## Anti-Patterns
- Use Case importing a framework type (HTTP request, ORM model) — collapses the layer boundary.
- Entity containing validation that depends on database state (entities should be self-validating with pure logic only).
- Skipping the Use Case layer and calling Repositories directly from Controllers.
- Sharing data structures across layers without explicit mapping (creates coupling between layers).

## Generic Example Structure
```
Entities/
  User, Order, Product   (domain objects, pure logic)

UseCases/
  RegisterUserUseCase    (orchestrates entities, defines UserRepository interface)
  Input: RegisterUserRequest; Output: RegisterUserResponse

InterfaceAdapters/
  UserController         (HTTP → UseCaseInput)
  UserPresenter          (UseCaseOutput → HTTP response)
  SqlUserRepository      (implements UserRepository from UseCases)

Frameworks/
  Express/Flask/Axum     (wires controllers to routes)
  PostgreSQL driver      (used by SqlUserRepository)
```

## Go

### Notes
- Organize as packages: `domain/`, `usecase/`, `adapter/`, `infrastructure/`.
- Use Case packages define their own `Input`/`Output` structs and Repository interfaces.
- Wire everything in `main.go` or an `app` package; inner packages never call outer ones.
- Testing Use Cases is pure Go — inject in-memory repository implementations; no HTTP or DB setup.

### Example Structure
```go
// domain/user.go — innermost, no imports from other layers
type User struct { ID, Name string }

// usecase/register.go
type UserRepository interface { Save(*domain.User) error }
type RegisterInput  struct { Name string }
type RegisterOutput struct { UserID string }

type RegisterUserUseCase struct { repo UserRepository }
func (uc *RegisterUserUseCase) Execute(in RegisterInput) (RegisterOutput, error) {
    u := &domain.User{Name: in.Name}
    if err := uc.repo.Save(u); err != nil { return RegisterOutput{}, err }
    return RegisterOutput{UserID: u.ID}, nil
}

// adapter/postgres_user_repo.go — implements usecase.UserRepository
type PostgresUserRepo struct { db *sql.DB }
func (r *PostgresUserRepo) Save(u *domain.User) error { /* SQL */ }
```

## Java

### Notes
- Maven/Gradle modules enforce layer boundaries: `domain`, `application` (use cases), `adapters`, `infrastructure`.
- Use Case input/output: plain Java records or value objects — no Spring annotations in these classes.
- Spring belongs only in the infrastructure layer; Use Cases are Spring-unaware.
- Mappers (MapStruct or hand-written) convert between layer-specific data structures at each boundary.

### Example Structure
```java
// domain/User.java — no framework imports
public class User { private String id; private String name; /* ... */ }

// application/RegisterUserUseCase.java
public class RegisterUserUseCase {
    private final UserRepository repo; // interface defined here
    public RegisterUserUseCase(UserRepository repo) { this.repo = repo; }
    public RegisterUserResponse execute(RegisterUserRequest req) { /* orchestrate */ }
}

// adapters/JpaUserRepository.java — implements application.UserRepository
@Repository
public class JpaUserRepository implements UserRepository { /* JPA */ }
```

## Python

### Notes
- Use Python packages as layers: `domain/`, `application/`, `adapters/`, `infrastructure/`.
- `__init__.py` can enforce imports: raise `ImportError` in inner packages if outer package names appear.
- `dataclasses` or `attrs` for Entities and Use Case I/O structs; avoid Pydantic models in the domain layer.
- FastAPI/Django live in infrastructure; route handlers call Use Case classes only.

### Example Structure
```python
# domain/user.py
from dataclasses import dataclass

@dataclass
class User:
    id: str
    name: str

# application/register_user.py
from domain.user import User
from typing import Protocol

class UserRepository(Protocol):
    def save(self, user: User) -> None: ...

@dataclass
class RegisterUserRequest:  name: str
@dataclass
class RegisterUserResponse: user_id: str

class RegisterUserUseCase:
    def __init__(self, repo: UserRepository): self._repo = repo
    def execute(self, req: RegisterUserRequest) -> RegisterUserResponse:
        user = User(id=generate_id(), name=req.name)
        self._repo.save(user)
        return RegisterUserResponse(user_id=user.id)
```

## Rust

### Notes
- Workspace crates as layers: `domain`, `application`, `adapters`, `infrastructure`, `main`.
- `Cargo.toml` `[dependencies]` encodes the dependency rule — `domain` crate has no external deps.
- Use Case crates define traits for outbound ports; adapter crates implement them.
- All framework types (Axum, Diesel) live in `infrastructure` or `adapters` — not in `domain` or `application`.

### Example Structure
```rust
// domain/src/user.rs — no external crate dependencies
pub struct User { pub id: String, pub name: String }

// application/src/register_user.rs
use domain::User;
pub trait UserRepository: Send + Sync {
    fn save(&self, user: &User) -> Result<(), Error>;
}
pub struct RegisterUserUseCase<R: UserRepository> { pub repo: R }
impl<R: UserRepository> RegisterUserUseCase<R> {
    pub fn execute(&self, name: &str) -> Result<String, Error> {
        let user = User { id: generate_id(), name: name.to_string() };
        self.repo.save(&user)?;
        Ok(user.id)
    }
}
```
