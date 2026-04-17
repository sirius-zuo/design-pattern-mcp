---
name: Repository
category: modern
languages: [go, java, python, rust, generic]
triggers:
  - decouple domain logic from data access
  - swap storage backend without changing business code
  - domain tests without real database
---

## Overview
Mediates between the domain and data mapping layers using a collection-like interface for accessing domain objects. Centralizes data access logic and decouples domain code from persistence technology.

## Components
- **Repository** (interface): Declares CRUD and query methods using domain types. No persistence-specific types in method signatures.
- **ConcreteRepository**: Implements the interface against a specific storage backend (SQL, NoSQL, in-memory).
- **Domain Entity**: The object being persisted. Contains no persistence logic.
- **Unit of Work** (optional): Groups multiple repository operations into a single transaction.

## Constraints
- Repository interface must use domain types only — no ORM models, SQL result sets, or database-specific types in signatures.
- Repository must NOT contain business logic; it only translates between domain objects and persistence format.
- Queries beyond simple CRUD must be encapsulated as named repository methods, not exposed as raw query builders.
- Transactions must be managed outside the Repository (Unit of Work or service layer), not inside individual repository methods.

## Anti-Patterns
- Leaking ORM entities or SQL types through the repository interface (breaks domain isolation).
- Repository methods that take raw SQL or query builder objects as parameters.
- Combining domain logic with data mapping inside repository methods.
- One giant repository for the entire aggregate — one Repository per aggregate root.

## Generic Example Structure
```
interface UserRepository {
  findByID(id: ID): User
  findByEmail(email: string): User
  save(u: User): void
  delete(id: ID): void
}

InMemoryUserRepository implements UserRepository {
  store: map[ID]User
  findByID(id): User { return store[id] }
  save(u): void { store[u.id] = u }
}

PostgresUserRepository implements UserRepository {
  db: DB
  findByID(id): User { /* SQL query, map to domain User */ }
  save(u): void { /* INSERT/UPDATE */ }
}
```

## Go

### Notes
- Define the Repository as a Go interface in the domain package; implementations live in an `infrastructure` or `persistence` package.
- Accept `context.Context` as the first parameter in every method for timeout and cancellation propagation.
- Use `sqlc` or `pgx` in implementations; never expose `*sql.Rows` through the interface.
- In-memory implementations (`map[ID]Entity`) are ideal test doubles — no mocking library needed.

### Example Structure
```go
// domain/user.go
type User struct { ID uuid.UUID; Email string; Name string }

// domain/repository.go
type UserRepository interface {
    FindByID(ctx context.Context, id uuid.UUID) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    Save(ctx context.Context, u *User) error
    Delete(ctx context.Context, id uuid.UUID) error
}

// infrastructure/postgres_user_repository.go
type PostgresUserRepository struct{ db *pgxpool.Pool }
func (r *PostgresUserRepository) FindByID(ctx context.Context, id uuid.UUID) (*User, error) {
    // query and map to domain.User
    return nil, nil
}
```

## Java

### Notes
- Spring Data `JpaRepository<T, ID>` auto-generates implementations; use a custom interface extending it for domain queries.
- Annotate custom query methods with `@Query` to keep SQL/JPQL in the repository layer.
- For non-Spring projects, define a plain interface; the implementation uses JPA `EntityManager` directly.
- Use `Optional<T>` return types for find-by methods to force callers to handle the not-found case.

### Example Structure
```java
// Domain
public record User(UUID id, String email, String name) {}

// Repository interface
public interface UserRepository {
    Optional<User> findById(UUID id);
    Optional<User> findByEmail(String email);
    void save(User user);
    void delete(UUID id);
}

// In-memory test double
public class InMemoryUserRepository implements UserRepository {
    private final Map<UUID, User> store = new HashMap<>();
    public Optional<User> findById(UUID id) { return Optional.ofNullable(store.get(id)); }
    public void save(User u) { store.put(u.id(), u); }
    public void delete(UUID id) { store.remove(id); }
    public Optional<User> findByEmail(String email) {
        return store.values().stream().filter(u -> u.email().equals(email)).findFirst();
    }
}
```

## Python

### Notes
- Define the Repository as a `Protocol` or `abc.ABC` in the domain layer; implementations in an infrastructure module.
- Use `dataclasses` or Pydantic models for domain entities — keep them free of ORM decorators.
- SQLAlchemy `Session` belongs in the infrastructure implementation, never imported in domain code.
- `pytest` fixtures returning in-memory repositories simplify unit tests dramatically.

### Example Structure
```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID
from typing import Optional

@dataclass
class User:
    id: UUID
    email: str
    name: str

class UserRepository(ABC):
    @abstractmethod
    def find_by_id(self, id: UUID) -> Optional[User]: ...
    @abstractmethod
    def find_by_email(self, email: str) -> Optional[User]: ...
    @abstractmethod
    def save(self, user: User) -> None: ...
    @abstractmethod
    def delete(self, id: UUID) -> None: ...

class InMemoryUserRepository(UserRepository):
    def __init__(self) -> None: self._store: dict[UUID, User] = {}
    def find_by_id(self, id: UUID) -> Optional[User]: return self._store.get(id)
    def save(self, user: User) -> None: self._store[user.id] = user
    def delete(self, id: UUID) -> None: self._store.pop(id, None)
    def find_by_email(self, email: str) -> Optional[User]:
        return next((u for u in self._store.values() if u.email == email), None)
```

## Rust

### Notes
- Define the Repository as a trait in the domain crate; infrastructure crate implements it.
- Use `async_trait` crate when repository methods are async (e.g., `sqlx` queries).
- Return `Result<Option<Entity>, RepositoryError>` — never panic on not-found.
- `HashMap`-backed in-memory repositories implement the trait cheaply for tests.

### Example Structure
```rust
use uuid::Uuid;

#[derive(Clone)]
pub struct User { pub id: Uuid, pub email: String, pub name: String }

pub trait UserRepository {
    fn find_by_id(&self, id: Uuid) -> Option<User>;
    fn save(&mut self, user: User);
    fn delete(&mut self, id: Uuid);
}

pub struct InMemoryUserRepository { store: std::collections::HashMap<Uuid, User> }
impl UserRepository for InMemoryUserRepository {
    fn find_by_id(&self, id: Uuid) -> Option<User> { self.store.get(&id).cloned() }
    fn save(&mut self, user: User) { self.store.insert(user.id, user); }
    fn delete(&mut self, id: Uuid) { self.store.remove(&id); }
}
```
