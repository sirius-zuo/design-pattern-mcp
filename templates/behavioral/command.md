---
name: Command
category: behavioral
languages: [go, java, python, rust, generic]
triggers:
  - undo/redo required
  - queue or log operations
  - parameterize actions as objects
  - decouple invoker from executor
---

## Overview
Encapsulates a request as an object, allowing it to be parameterized, queued, logged, and undone. Decouples the object that invokes the operation from the object that performs it.

## Components
- **Command** (interface): Declares `execute()` and optionally `undo()`.
- **ConcreteCommand**: Implements Command by binding a Receiver method call with its arguments.
- **Receiver**: The object that knows how to perform the actual work. Contains the business logic.
- **Invoker**: Asks the command to execute; may store commands for undo/redo history.
- **Client**: Creates ConcreteCommands and sets their Receiver; configures the Invoker.

## Constraints
- ConcreteCommand must store everything needed to execute (and undo) at construction time — no look-ups during execute.
- Receiver must NOT know about Command or Invoker; it contains pure business logic.
- `undo()` must restore exactly the state that existed before `execute()` — capture pre-execution state at construction or in `execute()`.
- Invoker must NOT call Receiver methods directly — it must go through Command interface only.

## Anti-Patterns
- Putting business logic inside the ConcreteCommand itself (the logic belongs in Receiver).
- Invoker bypassing Command and calling Receiver methods directly (defeats decoupling).
- Not capturing enough state for `undo()` — leading to incomplete rollbacks.
- Storing commands in the history stack after a failed execute (only successful executions go in history).

## Generic Example Structure
```
interface Command {
  execute(): void
  undo(): void
}

Receiver {
  doAction(params): void
  undoAction(params): void
}

ConcreteCommand implements Command {
  receiver: Receiver
  params: Params
  previousState: State  // for undo

  execute(): void {
    previousState = receiver.capture()
    receiver.doAction(params)
  }
  undo(): void { receiver.undoAction(previousState) }
}

Invoker {
  history: []Command
  execute(cmd): void {
    cmd.execute()
    history.push(cmd)
  }
  undo(): void { history.pop().undo() }
}
```

## Go

### Notes
- For simple commands without undo, a function type (`type Command func() error`) is idiomatic.
- For undo/redo, define a full interface with `Execute() error` and `Undo() error`.
- Use a slice as the history stack; the invoker pops from the top on undo.
- Commands are naturally serializable if they hold value-type parameters — useful for persistent operation logs.

### Example Structure
```go
type Command interface {
    Execute() error
    Undo() error
}

type TextEditor struct{ content string }
func (e *TextEditor) Insert(text string)  { e.content += text }
func (e *TextEditor) Delete(n int)        { e.content = e.content[:len(e.content)-n] }

type InsertCommand struct {
    editor *TextEditor
    text   string
}
func (c *InsertCommand) Execute() error { c.editor.Insert(c.text); return nil }
func (c *InsertCommand) Undo() error    { c.editor.Delete(len(c.text)); return nil }

type Invoker struct{ history []Command }
func (inv *Invoker) Run(cmd Command) {
    if cmd.Execute() == nil { inv.history = append(inv.history, cmd) }
}
func (inv *Invoker) Undo() {
    if n := len(inv.history); n > 0 {
        inv.history[n-1].Undo()
        inv.history = inv.history[:n-1]
    }
}
```

## Java

### Notes
- Declare `Command` as a `@FunctionalInterface` when undo is not required; lambdas can then be commands.
- Use `Deque<Command>` (stack) for undo history; `LinkedList` implements both `Deque` and allows peeking.
- Spring Batch `Step` and `Tasklet` implement command semantics for ETL pipelines.
- Serializing commands to a database provides an auditable operation log.

### Example Structure
```java
interface Command { void execute(); void undo(); }

class TextEditor {
    private StringBuilder content = new StringBuilder();
    void insert(String text) { content.append(text); }
    void delete(int n) { content.delete(content.length() - n, content.length()); }
    String getContent() { return content.toString(); }
}

class InsertCommand implements Command {
    private final TextEditor editor;
    private final String text;
    InsertCommand(TextEditor editor, String text) { this.editor = editor; this.text = text; }
    public void execute() { editor.insert(text); }
    public void undo()    { editor.delete(text.length()); }
}
```

## Python

### Notes
- For simple cases without undo, use callables (lambdas or `functools.partial`) as commands.
- For undo, define a `Command` abstract base class with `execute()` and `undo()`.
- Store history as a `list[Command]` and pop from the end for undo operations.
- Commands are easy to serialize with `dataclasses` if they hold only serializable state.

### Example Structure
```python
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...
    @abstractmethod
    def undo(self) -> None: ...

class TextEditor:
    def __init__(self) -> None: self.content = ""
    def insert(self, text: str) -> None: self.content += text
    def delete(self, n: int) -> None: self.content = self.content[:-n]

class InsertCommand(Command):
    def __init__(self, editor: TextEditor, text: str) -> None:
        self._editor, self._text = editor, text

    def execute(self) -> None: self._editor.insert(self._text)
    def undo(self) -> None: self._editor.delete(len(self._text))
```

## Rust

### Notes
- Define `Command` as a trait with `execute(&mut self)` and `undo(&mut self)`.
- Box commands (`Box<dyn Command>`) to store heterogeneous command types in a history `Vec`.
- For serializable commands, derive `serde::Serialize/Deserialize` on concrete command structs.
- Closures (`Box<dyn FnMut()>`) are lightweight commands when undo is not required.

### Example Structure
```rust
trait Command {
    fn execute(&mut self);
    fn undo(&mut self);
}

struct TextEditor { content: String }
impl TextEditor {
    fn insert(&mut self, text: &str) { self.content.push_str(text); }
    fn delete(&mut self, n: usize) {
        let len = self.content.len();
        self.content.truncate(len - n);
    }
}

struct InsertCommand<'a> { editor: &'a mut TextEditor, text: String }
impl<'a> Command for InsertCommand<'a> {
    fn execute(&mut self) { self.editor.insert(&self.text.clone()); }
    fn undo(&mut self)    { self.editor.delete(self.text.len()); }
}
```
