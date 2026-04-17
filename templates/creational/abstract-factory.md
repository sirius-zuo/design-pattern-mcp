---
name: Abstract Factory
category: creational
languages: [go, java, python, rust, generic]
triggers:
  - families of related objects
  - swap entire product family at runtime
  - related objects must be compatible
  - create objects without specifying concrete classes
  - consistent set of products across variants
---

## Overview
Provides an interface for creating families of related objects without specifying their concrete classes. All products created by one factory are guaranteed to be compatible with each other.

## Components
- **AbstractFactory**: Declares creation methods for each distinct product in the family.
- **ConcreteFactory**: Implements creation methods for a specific product family (e.g., WindowsFactory, MacFactory).
- **AbstractProduct**: Declares the interface for a type of product object.
- **ConcreteProduct**: Implements the AbstractProduct interface for a specific family.
- **Client**: Uses only AbstractFactory and AbstractProduct interfaces; never references concrete types.

## Constraints
- Client must NOT reference ConcreteFactory or ConcreteProduct directly — only abstractions.
- All products from a single factory must be designed to work together; mixing products from different factories must be prevented.
- Adding a new product type requires changing the AbstractFactory interface and all ConcreteFactory implementations.
- Factory selection must happen at a single configuration point, not scattered across the codebase.

## Anti-Patterns
- Instantiating ConcreteProduct directly inside client code (defeats the abstraction).
- Using a single factory method with a type enum to select the product (that is Factory Method, not Abstract Factory).
- Mixing products from different concrete factories (e.g., WindowsButton with MacCheckbox).
- Making AbstractFactory concrete with partial overrides — use a pure interface or abstract class.

## Generic Example Structure
```
interface AbstractFactory {
  createButton(): Button
  createCheckbox(): Checkbox
}

interface Button { render(): void }
interface Checkbox { toggle(): void }

ConcreteFactoryWindows implements AbstractFactory {
  createButton(): Button  { return WindowsButton{} }
  createCheckbox(): Checkbox { return WindowsCheckbox{} }
}

ConcreteFactoryMac implements AbstractFactory {
  createButton(): Button  { return MacButton{} }
  createCheckbox(): Checkbox { return MacCheckbox{} }
}

Client(f: AbstractFactory) {
  btn := f.createButton()
  chk := f.createCheckbox()
  btn.render(); chk.toggle()
}
```

## Go

### Notes
- Define each product family as a pair of interfaces; the factory interface returns those interfaces.
- Use a constructor function (`NewWindowsFactory() AbstractFactory`) to select the concrete factory at startup.
- Avoid embedding concrete factory structs; return interface types from factory methods.
- Group related product interfaces in the same package to keep the family contract explicit.

### Example Structure
```go
type Button interface{ Render() }
type Checkbox interface{ Toggle() }

type GUIFactory interface {
    CreateButton() Button
    CreateCheckbox() Checkbox
}

type WindowsFactory struct{}
func (WindowsFactory) CreateButton() Button   { return &WindowsButton{} }
func (WindowsFactory) CreateCheckbox() Checkbox { return &WindowsCheckbox{} }

type MacFactory struct{}
func (MacFactory) CreateButton() Button   { return &MacButton{} }
func (MacFactory) CreateCheckbox() Checkbox { return &MacCheckbox{} }

func BuildUI(f GUIFactory) {
    f.CreateButton().Render()
    f.CreateCheckbox().Toggle()
}
```

## Java

### Notes
- Declare AbstractFactory as an interface; concrete factories implement it.
- Use generics sparingly — the product type hierarchy usually makes them unnecessary.
- Spring: register each ConcreteFactory as a `@Bean` and inject the selected one via a `@Qualifier`.
- Keep product interfaces narrow; avoid God-interfaces that couple unrelated products.

### Example Structure
```java
interface GUIFactory {
    Button createButton();
    Checkbox createCheckbox();
}

class WindowsFactory implements GUIFactory {
    public Button createButton()     { return new WindowsButton(); }
    public Checkbox createCheckbox() { return new WindowsCheckbox(); }
}

class MacFactory implements GUIFactory {
    public Button createButton()     { return new MacButton(); }
    public Checkbox createCheckbox() { return new MacCheckbox(); }
}

class Application {
    Application(GUIFactory factory) {
        factory.createButton().render();
        factory.createCheckbox().toggle();
    }
}
```

## Python

### Notes
- Use `abc.ABC` and `@abstractmethod` to enforce the factory contract.
- `Protocol` (structural subtyping) is lighter if strict inheritance is undesirable.
- Select the concrete factory based on configuration or environment variable at the entry point.
- Dataclasses work well for simple concrete products.

### Example Structure
```python
from abc import ABC, abstractmethod

class Button(ABC):
    @abstractmethod
    def render(self) -> None: ...

class GUIFactory(ABC):
    @abstractmethod
    def create_button(self) -> Button: ...
    @abstractmethod
    def create_checkbox(self) -> "Checkbox": ...

class WindowsFactory(GUIFactory):
    def create_button(self) -> Button:
        return WindowsButton()
    def create_checkbox(self) -> "Checkbox":
        return WindowsCheckbox()
```

## Rust

### Notes
- Model each product as a trait and the factory as a trait with associated types or boxed trait returns.
- `Box<dyn Product>` enables runtime family selection; generic associated types allow static dispatch.
- Implement each concrete factory as a zero-size struct.
- Use a `cfg` feature flag or environment-driven factory selection at the application root.

### Example Structure
```rust
trait Button { fn render(&self); }
trait Checkbox { fn toggle(&self); }

trait GUIFactory {
    fn create_button(&self) -> Box<dyn Button>;
    fn create_checkbox(&self) -> Box<dyn Checkbox>;
}

struct WindowsFactory;
impl GUIFactory for WindowsFactory {
    fn create_button(&self) -> Box<dyn Button>   { Box::new(WindowsButton) }
    fn create_checkbox(&self) -> Box<dyn Checkbox> { Box::new(WindowsCheckbox) }
}

fn build_ui(factory: &dyn GUIFactory) {
    factory.create_button().render();
    factory.create_checkbox().toggle();
}
```
