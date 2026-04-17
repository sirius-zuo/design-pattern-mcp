---
name: Factory Method
category: creational
languages: [go, java, python, rust, generic]
triggers:
  - subclass controls which class is instantiated
  - object creation logic too complex for constructor
  - create objects without specifying exact class
  - decouple creator from product
---

## Overview
Defines an interface for creating an object but lets subclasses or implementations decide which class to instantiate. The creator defers instantiation to a factory method, decoupling it from the concrete product.

## Components
- **Creator**: Declares the factory method returning a Product. May contain default implementation or call the factory method in its own logic.
- **ConcreteCreator**: Overrides the factory method to return a specific ConcreteProduct.
- **Product** (interface): Defines the interface all products must implement.
- **ConcreteProduct**: Implements the Product interface; created by a specific ConcreteCreator.

## Constraints
- Creator must NOT instantiate ConcreteProduct directly outside the factory method.
- The factory method must return the Product interface type, not a concrete type.
- ConcreteCreator must be the only place that knows which ConcreteProduct is created.
- Do not add selection logic (switch/if on type) inside the factory method — each ConcreteCreator handles exactly one product.

## Anti-Patterns
- Putting a type-switch or if-else chain in the factory method to select among products (use a registry or Abstract Factory instead).
- Returning a concrete type from the factory method — always return the interface.
- Calling the factory method from outside the creator hierarchy to bypass the abstraction.
- Conflating Factory Method with a static utility method that just calls `new` — the pattern requires polymorphic creator dispatch.

## Generic Example Structure
```
interface Product { use(): void }

abstract Creator {
  abstract factoryMethod(): Product   // subclasses override this
  doWork(): void {
    p := factoryMethod()
    p.use()
  }
}

ConcreteCreatorA extends Creator {
  factoryMethod(): Product { return ConcreteProductA{} }
}

ConcreteCreatorB extends Creator {
  factoryMethod(): Product { return ConcreteProductB{} }
}
```

## Go

### Notes
- Go has no subclassing; model Creator as an interface with a `Create() Product` method.
- Package-level constructor functions (`NewLoggerCreator()`) act as concrete creators.
- Return the Product interface from factory functions; callers depend only on the interface.
- Use a registry map (`map[string]func() Product`) when the set of products is dynamic.

### Example Structure
```go
type Transport interface{ Deliver() }

type Creator interface{ Create() Transport }

type TruckCreator struct{}
func (TruckCreator) Create() Transport { return &Truck{} }

type ShipCreator struct{}
func (ShipCreator) Create() Transport { return &Ship{} }

func PlanDelivery(c Creator) {
    t := c.Create()
    t.Deliver()
}
```

## Java

### Notes
- Classic form: abstract `Creator` class with an abstract `factoryMethod()`; subclasses override it.
- Alternatively, use an interface with a default method that calls the factory method.
- Mark the factory method `protected` if it should only be called internally by the creator.
- Use generics (`Creator<T extends Product>`) when the product type must be statically typed at the call site.

### Example Structure
```java
interface Transport { void deliver(); }

abstract class Logistics {
    abstract Transport createTransport(); // factory method

    void planDelivery() {
        Transport t = createTransport();
        t.deliver();
    }
}

class RoadLogistics extends Logistics {
    @Override
    Transport createTransport() { return new Truck(); }
}

class SeaLogistics extends Logistics {
    @Override
    Transport createTransport() { return new Ship(); }
}
```

## Python

### Notes
- Use an abstract base class with `@abstractmethod` for the factory method.
- Alternatively, accept a callable factory parameter for a lighter, more functional approach.
- `__init_subclass__` can auto-register subclasses for dynamic product selection.
- Type-annotate the return as the Product protocol/ABC to keep callers interface-agnostic.

### Example Structure
```python
from abc import ABC, abstractmethod

class Transport(ABC):
    @abstractmethod
    def deliver(self) -> None: ...

class Logistics(ABC):
    @abstractmethod
    def create_transport(self) -> Transport: ...  # factory method

    def plan_delivery(self) -> None:
        t = self.create_transport()
        t.deliver()

class RoadLogistics(Logistics):
    def create_transport(self) -> Transport:
        return Truck()
```

## Rust

### Notes
- There is no subclassing; model the factory method as a trait method returning `Box<dyn Product>`.
- Each struct implementing the Creator trait is the ConcreteCreator.
- For static dispatch, use associated types (`type Output: Product`) instead of `Box<dyn>`.
- A `fn create(kind: &str) -> Box<dyn Product>` function with a match is acceptable for small enumerations.

### Example Structure
```rust
trait Transport { fn deliver(&self); }

trait Logistics {
    fn create_transport(&self) -> Box<dyn Transport>; // factory method

    fn plan_delivery(&self) {
        self.create_transport().deliver();
    }
}

struct RoadLogistics;
impl Logistics for RoadLogistics {
    fn create_transport(&self) -> Box<dyn Transport> { Box::new(Truck) }
}

struct SeaLogistics;
impl Logistics for SeaLogistics {
    fn create_transport(&self) -> Box<dyn Transport> { Box::new(Ship) }
}
```
