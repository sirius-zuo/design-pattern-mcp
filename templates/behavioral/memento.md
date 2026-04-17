---
name: Memento
category: behavioral
languages: [go, java, python, rust, generic]
triggers:
  - undo/redo state
  - save and restore object state
  - checkpoint without exposing internals
  - snapshot before risky operation
---

## Overview
Captures and externalizes an object's internal state so it can be restored later, without violating encapsulation. The Originator creates snapshots; the Caretaker stores them; only the Originator can read the snapshot contents.

## Components
- **Originator**: The object whose state is saved. Creates Mementos from its current state; restores from them.
- **Memento**: Stores a snapshot of the Originator's internal state. Exposes state only to Originator.
- **Caretaker**: Manages the history of Mementos. Stores and retrieves them but NEVER inspects their contents.

## Constraints
- Only the Originator may read or write the Memento's state — Caretaker treats it as an opaque token.
- Memento must be immutable after creation; the Originator must not be able to modify an existing snapshot.
- Caretaker must NOT use Memento data for any logic — it only stores and retrieves by index or timestamp.
- Deep-copy all mutable objects inside the Memento to prevent aliasing back to the Originator's live state.

## Anti-Patterns
- Exposing Memento fields publicly so Caretaker (or any class) can read or modify them.
- Storing only a shallow copy — mutations to the Originator leak through into the "saved" snapshot.
- Keeping unlimited undo history without a size cap (unbounded memory growth).
- Using Memento when the state is easily reconstructible from a command log (Command pattern is lighter).

## Generic Example Structure
```
Memento {
  private state: State
  // only Originator can access state
}

Originator {
  state: State
  save(): Memento { return Memento(deepCopy(state)) }
  restore(m: Memento): void { state = m.state }
}

Caretaker {
  history: []Memento
  backup(o: Originator): void { history.push(o.save()) }
  undo(o: Originator): void {
    if history.empty() { return }
    o.restore(history.pop())
  }
}
```

## Go

### Notes
- Enforce Memento opacity by using an unexported struct or an opaque interface type.
- Return a snapshot as an immutable value type (struct) to prevent mutation after creation.
- Caretaker stores `[]Memento` and pops from the end for undo.
- For large state objects, store a diff (delta) rather than a full snapshot to limit memory usage.

### Example Structure
```go
// Opaque memento — fields unexported
type memento struct{ state editorState }

type editorState struct {
    content string
    cursor  int
}

type Editor struct{ state editorState }

func (e *Editor) Save() memento { return memento{state: e.state} }
func (e *Editor) Restore(m memento) { e.state = m.state }

type History struct{ stack []memento }
func (h *History) Push(e *Editor) { h.stack = append(h.stack, e.Save()) }
func (h *History) Pop(e *Editor) {
    if n := len(h.stack); n > 0 {
        e.Restore(h.stack[n-1])
        h.stack = h.stack[:n-1]
    }
}
```

## Java

### Notes
- Use a private inner class inside Originator for Memento to enforce access restriction at compile time.
- `record` (Java 16+) is ideal for immutable Mementos with compact constructors.
- Limit history size with a `Deque` bounded by max capacity (e.g., `ArrayDeque` with a size check).
- Serialization of Mementos enables persistent undo history across application restarts.

### Example Structure
```java
class Editor {
    private String content;
    private int cursor;

    // Private inner Memento — only Editor can access its fields
    static final class Memento {
        private final String content;
        private final int cursor;
        private Memento(String content, int cursor) {
            this.content = content; this.cursor = cursor;
        }
    }

    Memento save() { return new Memento(content, cursor); }
    void restore(Memento m) { this.content = m.content; this.cursor = m.cursor; }
}

class History {
    private final Deque<Editor.Memento> stack = new ArrayDeque<>();
    void push(Editor e) { stack.push(e.save()); }
    void undo(Editor e) { if (!stack.isEmpty()) e.restore(stack.pop()); }
}
```

## Python

### Notes
- Use `__slots__` and name-mangled (`__state`) attributes to discourage external access to Memento internals.
- `copy.deepcopy()` is the simplest way to create a full snapshot of the Originator's state.
- `dataclasses.asdict()` + JSON serialization converts mementos to a persistent format.
- Limit the history list length with `collections.deque(maxlen=N)` to cap memory usage.

### Example Structure
```python
import copy
from collections import deque

class EditorMemento:
    def __init__(self, state: dict) -> None:
        self.__state = copy.deepcopy(state)  # name-mangled, opaque

    def _get_state(self) -> dict:  # only Originator should call this
        return self.__state

class Editor:
    def __init__(self) -> None:
        self._state = {"content": "", "cursor": 0}

    def save(self) -> EditorMemento:
        return EditorMemento(self._state)

    def restore(self, m: EditorMemento) -> None:
        self._state = m._get_state()

class History:
    def __init__(self, max_size: int = 50) -> None:
        self._stack: deque[EditorMemento] = deque(maxlen=max_size)

    def push(self, editor: Editor) -> None: self._stack.append(editor.save())
    def undo(self, editor: Editor) -> None:
        if self._stack: editor.restore(self._stack.pop())
```

## Rust

### Notes
- Use a newtype (`struct Memento(State)`) with private fields to enforce opacity.
- `State: Clone` is sufficient for value types; `State: Clone + Send` when history crosses threads.
- `VecDeque` with a max-length check is a memory-bounded history stack.
- Snapshots serialize naturally with `serde` for persistent undo across sessions.

### Example Structure
```rust
#[derive(Clone)]
struct EditorState { content: String, cursor: usize }

// Opaque newtype — inner field is private
pub struct Memento(EditorState);

pub struct Editor { state: EditorState }
impl Editor {
    pub fn save(&self) -> Memento { Memento(self.state.clone()) }
    pub fn restore(&mut self, m: Memento) { self.state = m.0; }
}

pub struct History { stack: Vec<Memento> }
impl History {
    pub fn push(&mut self, e: &Editor) { self.stack.push(e.save()); }
    pub fn undo(&mut self, e: &mut Editor) {
        if let Some(m) = self.stack.pop() { e.restore(m); }
    }
}
```
