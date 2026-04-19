---
name: Layered Architecture
category: architectural
aliases: [N-Tier]
languages: [go, java, python, rust, typescript, generic]
triggers:
  - traditional enterprise application
  - presentation business data separation
  - team familiar with layered structure
  - CRUD application with standard request-response flow
  - separate concerns by technical role
---

## Overview
Organizes code into horizontal layers — Presentation, Business Logic (Service), and Data Access (Repository/DAO) — where each layer depends only on the layer directly below it. Requests flow top-down; data flows bottom-up.

## Components
- **Presentation Layer**: Handles HTTP requests, CLI input, or UI interactions. Calls Service layer; returns responses or renders views.
- **Service Layer**: Implements business logic and transaction management. Orchestrates domain objects and calls Repository layer. Contains the "what" of the application.
- **Repository/DAO Layer**: Abstracts data access. Executes queries and maps results to domain objects. Knows nothing about HTTP or business rules.
- **Domain/Model**: Data structures (entities, DTOs) shared across layers or specific to a layer boundary.

## Constraints
- Each layer must only call the layer directly below — Presentation must NOT call Repository directly.
- Service layer must NOT contain HTTP, framework, or rendering logic.
- Repository layer must NOT contain business rules or validation logic.
- Domain objects passed between layers should be immutable DTOs at layer boundaries to prevent coupling.

## Anti-Patterns
- Presentation layer calling Repository directly (skips Service, bypasses business rules and transactions).
- Service layer returning HTTP response objects (couples business logic to the delivery mechanism).
- Repository methods that encode business rules (e.g., `findActiveUsersForPromotion` — business concepts in data layer).
- Fat Service layer that also handles request parsing and response formatting.

## Generic Example Structure
```
Presentation (Controller/Handler)
  → receives HTTP/CLI input
  → calls Service
  → returns response

Service
  → validates, applies business rules
  → calls Repository
  → returns domain objects or DTOs

Repository/DAO
  → executes queries
  → maps rows to entities
  → returns entities

Database / External System
```

## Go

### Notes
- Standard layout: `handler/`, `service/`, `repository/` packages with interfaces at each boundary.
- Define Repository interfaces in the `service` package (or a shared `domain` package) so services depend on abstractions.
- Use structs for DTOs passed between layers; avoid passing raw `map[string]interface{}` across boundaries.
- `database/sql` or `sqlx` in the Repository layer; the Service layer never imports `database/sql`.

### Example Structure
```go
// repository/user_repo.go
type UserRepository interface { FindByID(id string) (*User, error) }
type sqlUserRepo struct { db *sql.DB }
func (r *sqlUserRepo) FindByID(id string) (*User, error) { /* SQL */ }

// service/user_service.go
type UserService struct { repo UserRepository }
func (s *UserService) GetUser(id string) (*UserDTO, error) {
    u, err := s.repo.FindByID(id)
    if err != nil { return nil, err }
    return toDTO(u), nil
}

// handler/user_handler.go
type UserHandler struct { svc *service.UserService }
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    dto, _ := h.svc.GetUser(chi.URLParam(r, "id"))
    json.NewEncoder(w).Encode(dto)
}
```

## Java

### Notes
- Spring Boot naturally implements this: `@RestController` (Presentation), `@Service` (Business), `@Repository` (Data).
- Use `@Transactional` on Service methods, never on Controllers.
- DTOs at the Presentation boundary; JPA entities stay within or below the Service layer.
- Use MapStruct for DTO↔Entity mapping at layer boundaries.

### Example Structure
```java
@RestController @RequestMapping("/users")
class UserController {
    @Autowired UserService userService;
    @GetMapping("/{id}")
    UserDTO getUser(@PathVariable String id) { return userService.getUser(id); }
}

@Service
class UserService {
    @Autowired UserRepository repo;
    @Transactional(readOnly = true)
    public UserDTO getUser(String id) {
        User user = repo.findById(id).orElseThrow();
        return UserMapper.toDTO(user);
    }
}

@Repository
interface UserRepository extends JpaRepository<User, String> {}
```

## Python

### Notes
- Django follows this naturally: views (Presentation) → service functions → ORM querysets (Repository).
- Avoid putting business logic directly in Django views or models — extract to a `services.py` module.
- FastAPI: router functions (Presentation) call service classes; service classes use repositories.
- SQLAlchemy Session usage belongs in the Repository layer; services receive domain objects, not Sessions.

### Example Structure
```python
# repository/user_repository.py
class UserRepository:
    def __init__(self, session): self._session = session
    def find_by_id(self, user_id: str) -> "User | None":
        return self._session.get(User, user_id)

# service/user_service.py
class UserService:
    def __init__(self, repo: UserRepository): self._repo = repo
    def get_user(self, user_id: str) -> UserDTO:
        user = self._repo.find_by_id(user_id)
        if not user: raise NotFoundError(user_id)
        return UserDTO.from_entity(user)

# handler/user_router.py (FastAPI)
@router.get("/users/{user_id}")
def get_user(user_id: str, svc: UserService = Depends(get_user_service)):
    return svc.get_user(user_id)
```

## Rust

### Notes
- Organize as modules or workspace crates: `handlers`, `services`, `repositories`.
- Use trait objects or generics for Repository interfaces so Services are testable without a real DB.
- Axum/Actix handlers (Presentation) call service structs; service structs hold repository trait objects.
- `sqlx` or `diesel` stay in the repository layer; services import only domain types and repository traits.

### Example Structure
```rust
// repository/mod.rs
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<Option<User>>;
}
pub struct SqlxUserRepository { pool: PgPool }
#[async_trait] impl UserRepository for SqlxUserRepository { /* sqlx */ }

// service/user_service.rs
pub struct UserService { repo: Arc<dyn UserRepository> }
impl UserService {
    pub async fn get_user(&self, id: &str) -> Result<UserDTO> {
        let user = self.repo.find_by_id(id).await?.ok_or(NotFound)?;
        Ok(UserDTO::from(user))
    }
}

// handler/user_handler.rs (Axum)
async fn get_user(Path(id): Path<String>, State(svc): State<Arc<UserService>>) -> impl IntoResponse {
    Json(svc.get_user(&id).await.unwrap())
}
```

## TypeScript

### Notes
- NestJS aligns naturally with layered: `@Controller` (presentation) → `@Injectable` service (business) → repository (data).
- `interface` types in the service layer decouple business logic from controller and repository implementations.
- DTO types in the presentation layer; Entity types in the data layer — explicit mapping between layers prevents leakage.
- `eslint-plugin-import` no-restricted-imports rules enforce that presentation layer never imports from the data layer directly.

### Example Structure
```typescript
// Presentation layer
@Controller('users')
class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserDTO> {
    return this.userService.findById(id);
  }
}

// Business layer
@Injectable()
class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async findById(id: string): Promise<UserDTO> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return { id: user.id, email: user.email, name: user.name };
  }
}

// Data layer
@Injectable()
class UserRepository {
  constructor(@InjectRepository(UserEntity) private repo: Repository<UserEntity>) {}
  async findById(id: string): Promise<UserEntity | null> { return this.repo.findOneBy({ id }); }
}
```
