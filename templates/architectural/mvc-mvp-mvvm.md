---
name: MVC/MVP/MVVM
category: architectural
languages: [go, java, python, rust, typescript, generic]
triggers:
  - UI application with separate presentation and business logic
  - testable UI components
  - separate data model from view
---

## Overview
A family of patterns that separate UI applications into a Model (data/business logic), a View (display), and a mediating layer (Controller, Presenter, or ViewModel) that handles input and synchronizes Model and View.

## Components
- **Model**: Holds application data and business logic. Notifies observers on change. Completely independent of the View.
- **View**: Displays data to the user. In MVC, may observe the Model directly. In MVP/MVVM, communicates only through Presenter/ViewModel.
- **Controller** (MVC): Receives user input and updates Model/View. May have tight coupling to View.
- **Presenter** (MVP): Mediates between View and Model. Holds no reference to View implementation — uses a View interface.
- **ViewModel** (MVVM): Exposes observable properties and commands. View data-binds to ViewModel; no direct Model access.

## Constraints
- Model must NOT import or reference any View or UI framework type.
- Presenter/ViewModel must be unit-testable without instantiating any real View.
- View must NOT contain business logic or data transformation — only rendering and user input forwarding.
- In MVVM, ViewModel must NOT call View methods directly; data binding drives updates.

## Anti-Patterns
- Putting business logic in the Controller/Presenter/ViewModel (they are coordination layers, not domain layers).
- View directly modifying Model state, bypassing the mediating layer.
- Presenter holding a concrete View reference instead of a View interface (prevents testing with a mock View).
- Fat Controller/Presenter that handles unrelated concerns — split by feature or use a Service layer.

## Generic Example Structure
```
// MVC
Model { data; notify(observers) }
View  { render(model); onUserAction → controller.handle(action) }
Controller { model; view; handle(action) { model.update(action); view.render(model) } }

// MVP
View interface { display(data); getUserInput(): Input }
Presenter { model; view: View interface
  onAction(input): void { result = model.process(input); view.display(result) }
}

// MVVM
ViewModel { observableState; command: Command
  executeCommand(): void { model.process(); observableState.notify() }
}
View { binds to ViewModel.observableState; triggers ViewModel.command on user action }
```

## Go

### Notes
- Go web apps (e.g., with Chi or Gin) naturally follow MVC: handlers = Controllers, templates = Views, structs = Models.
- MVP is common for CLI tools: Presenter drives output format; View is `io.Writer`.
- For MVVM, reactive data binding requires a custom observable (channel or callback slice); Go has no built-in data binding.
- Keep handlers thin: delegate to a service layer for domain logic, keeping Controllers to HTTP concerns only.

### Example Structure
```go
// MVC (HTTP)
type UserModel struct { users []User }
func (m *UserModel) FindAll() []User { return m.users }

// View = template rendering (omitted for brevity)

type UserController struct { model *UserModel }
func (c *UserController) ListUsers(w http.ResponseWriter, r *http.Request) {
    users := c.model.FindAll()
    json.NewEncoder(w).Encode(users)
}
```

## Java

### Notes
- Spring MVC: `@Controller` (Controller), Thymeleaf/JSP (View), Spring Data entities (Model).
- JavaFX uses MVVM natively: FXML is the View; Controller class is the ViewModel; data binding via `Property<T>`.
- Android uses MVVM: `ViewModel` (lifecycle-aware) + `LiveData` + XML/Compose (View).
- Keep `@Service` layer between Controller and `@Repository` — Controllers should not call repositories directly.

### Example Structure
```java
// Spring MVC
@Controller
class UserController {
    @Autowired UserService userService; // Model-layer access via service

    @GetMapping("/users")
    String listUsers(Model model) {
        model.addAttribute("users", userService.findAll());
        return "users/list"; // View template name
    }
}
```

## Python

### Notes
- Django follows MVC (called MTV: Model-Template-View); views are closer to controllers.
- Flask + Jinja2 is a lightweight MVC: route functions are controllers, Jinja2 templates are views.
- Desktop GUIs (tkinter, PyQt) use MVP: a `Presenter` class holds the logic; view is the widget tree.
- In FastAPI, route functions are Controllers; Pydantic models are view-layer DTOs; domain models are the Model.

### Example Structure
```python
# Flask MVC
from flask import Flask, render_template
from models import UserRepository

app = Flask(__name__)
repo = UserRepository()

# Controller
@app.route("/users")
def list_users():
    users = repo.find_all()                 # Model
    return render_template("users.html", users=users)  # View
```

## Rust

### Notes
- Web frameworks (Axum, Actix-Web): handlers = Controllers, `askama`/`tera` templates = Views, domain structs = Models.
- GUI apps (egui, iced) use an Elm-architecture variant (like MVVM) with a `Model`, `update(msg)`, and `view()`.
- `iced` uses `Application::update` (Presenter/Controller) + `Application::view` (View) + message passing.
- Keep handler functions thin; delegate to a `service` module for domain operations.

### Example Structure
```rust
// Axum MVC-style handler
async fn list_users(State(repo): State<Arc<dyn UserRepository>>) -> impl IntoResponse {
    let users = repo.find_all().await.unwrap_or_default();
    Json(users)
}

// iced MVVM-style
struct Counter { value: i32 }                    // Model
#[derive(Debug, Clone)] enum Message { Increment } // Message (Command)
impl Counter {
    fn update(&mut self, msg: Message) {          // ViewModel update
        match msg { Message::Increment => self.value += 1 }
    }
}
```

## TypeScript

### Notes
- React: component = View; custom hook = ViewModel; service = Model — hooks separate UI state management from business logic.
- NestJS: `@Controller` = MVC Controller; `@Injectable` service = Model; JSON response = View (no template engine needed).
- Angular: Component (View + Controller) + Service (Model); `@Input`/`@Output` and two-way binding tie them together.
- Express: router/controller = Controller; service/repository = Model; template or JSON response = View.

### Example Structure
```typescript
// React MVVM — ViewModel as a custom hook
function useUserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await userService.fetchAll();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { users, loading, refresh: load };
}

// View consumes the ViewModel hook
function UserListView(): JSX.Element {
  const { users, loading, refresh } = useUserList();
  if (loading) return <Spinner />;
  return (
    <>
      <button onClick={refresh}>Refresh</button>
      <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
    </>
  );
}
```
