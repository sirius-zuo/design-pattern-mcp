---
name: Template Method
category: behavioral
languages: [go, java, python, rust, generic]
triggers:
  - same algorithm skeleton with variable steps
  - shared steps across subclasses with one different step
  - define invariant parts once with hooks for variation
---

## Overview
Defines the skeleton of an algorithm in a base class, deferring some steps to subclasses. Subclasses can override specific steps without changing the algorithm's overall structure.

## Components
- **AbstractClass**: Defines the template method (the algorithm skeleton) and declares abstract/hook methods for variable steps.
- **TemplateMethod**: The fixed algorithm in AbstractClass that calls abstract methods in a defined order. Must NOT be overridable.
- **AbstractStep**: Methods declared in AbstractClass that subclasses must implement (required variation points).
- **Hook**: Optional methods in AbstractClass with a default (empty) implementation that subclasses may override.
- **ConcreteClass**: Implements the abstract steps with variant behavior; may override hooks.

## Constraints
- The template method must be `final` (or equivalent) — subclasses must NOT override the algorithm skeleton.
- Abstract steps must be the minimal set required; avoid forcing subclasses to override steps they don't need.
- Hooks must have safe default implementations (empty or returning a neutral value) so subclasses can ignore them.
- ConcreteClass must NOT call `super.templateMethod()` directly — only the base class triggers the algorithm.

## Anti-Patterns
- Making the template method overridable — subclasses can then bypass the invariant structure.
- Declaring too many abstract steps, forcing all subclasses to implement methods irrelevant to them.
- Using Template Method when Strategy would suffice — prefer composition (Strategy) over inheritance (Template Method).
- ConcreteClass calling abstract steps directly instead of letting the template method orchestrate them.

## Generic Example Structure
```
AbstractClass {
  final templateMethod(): void {  // sealed — not overridable
    step1()         // invariant
    step2()         // abstract — subclass must implement
    hook()          // optional — default is no-op
    step3()         // invariant
  }

  step1(): void { /* shared logic */ }
  abstract step2(): void
  hook(): void { /* default: no-op */ }
  step3(): void { /* shared logic */ }
}

ConcreteClassA extends AbstractClass {
  step2(): void { /* variant A */ }
}

ConcreteClassB extends AbstractClass {
  step2(): void { /* variant B */ }
  hook(): void   { /* extra behavior */ }
}
```

## Go

### Notes
- Go has no inheritance; simulate Template Method with a struct that holds function fields (`step2 func()`).
- Alternatively, define an interface for the variable steps and pass a concrete implementation to a template function.
- The template function (not a method) calls the interface methods in the fixed order.
- Functional options can supply hook implementations at construction time.

### Example Structure
```go
type DataProcessor interface {
    Parse(raw string) []Record  // abstract step
    Filter(r Record) bool       // hook with default via wrapper
}

// Template function — the fixed skeleton
func Process(raw string, dp DataProcessor) []Record {
    records := dp.Parse(raw)
    var result []Record
    for _, r := range records {
        if dp.Filter(r) { result = append(result, r) }
    }
    return result
}

type CSVProcessor struct{}
func (CSVProcessor) Parse(raw string) []Record { /* parse CSV */ return nil }
func (CSVProcessor) Filter(_ Record) bool      { return true } // default hook
```

## Java

### Notes
- Declare the template method `final` in the abstract base class to prevent override.
- Use `protected abstract` for required steps and `protected` (non-abstract) for optional hooks.
- Prefer Template Method for algorithms that are mostly shared and vary in only one or two steps.
- When the number of variation points grows beyond two, switch to Strategy (composition over inheritance).

### Example Structure
```java
abstract class DataProcessor {
    // Template method — sealed
    public final void process(String raw) {
        List<Record> records = parse(raw);     // abstract
        records = validate(records);           // hook
        save(records);                         // invariant
    }

    protected abstract List<Record> parse(String raw);

    // Hook — default keeps all records
    protected List<Record> validate(List<Record> r) { return r; }

    private void save(List<Record> records) { /* shared save logic */ }
}

class CSVProcessor extends DataProcessor {
    protected List<Record> parse(String raw) { /* CSV parsing */ return List.of(); }
}
```

## Python

### Notes
- Use `abc.ABC` with `@abstractmethod` for required steps; provide a default implementation for hooks.
- Call `raise NotImplementedError` in abstract step methods if `@abstractmethod` is not used.
- Mark the template method with a naming convention (e.g., `process()`) or a docstring noting it should not be overridden (Python has no `final`).
- Mixin classes are an alternative to inheritance-based Template Method for horizontal reuse.

### Example Structure
```python
from abc import ABC, abstractmethod

class DataProcessor(ABC):
    def process(self, raw: str) -> list:  # template method
        records = self.parse(raw)
        records = self.validate(records)  # hook
        self._save(records)
        return records

    @abstractmethod
    def parse(self, raw: str) -> list: ...

    def validate(self, records: list) -> list:  # hook — default passthrough
        return records

    def _save(self, records: list) -> None:  # invariant shared step
        pass

class CSVProcessor(DataProcessor):
    def parse(self, raw: str) -> list:
        return [r.split(",") for r in raw.splitlines()]
```

## Rust

### Notes
- Simulate Template Method with a trait that provides a default method (template) calling required methods.
- Required steps are trait methods with no default; hooks have a default implementation.
- Mark the template method clearly in documentation; Rust has no `final` for trait methods.
- The trait approach is composition-friendly: structs implement only the steps they need to vary.

### Example Structure
```rust
trait DataProcessor {
    fn parse(&self, raw: &str) -> Vec<Record>; // required step

    fn validate(&self, records: Vec<Record>) -> Vec<Record> { records } // hook

    fn process(&self, raw: &str) -> Vec<Record> { // template method
        let records = self.parse(raw);
        let records = self.validate(records);
        self.save(&records);
        records
    }

    fn save(&self, _records: &[Record]) {} // shared invariant with default
}

struct CsvProcessor;
impl DataProcessor for CsvProcessor {
    fn parse(&self, _raw: &str) -> Vec<Record> { vec![] }
}
```
