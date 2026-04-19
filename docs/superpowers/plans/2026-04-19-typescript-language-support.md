# TypeScript Language Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `typescript` as a 6th language key to the design-pattern-mcp service, giving all 38 templates a `## TypeScript` section with idiomatic notes and an example.

**Architecture:** One-line change to `LANG_HEADING` in `src/loader.ts` unlocks parsing; tests extend the existing fixture; all 38 templates gain a `languages` frontmatter update and a new `## TypeScript` section at the end.

**Tech Stack:** TypeScript/Node.js, ts-jest, gray-matter, glob; no new dependencies.

---

## File Map

| File | Change |
|------|--------|
| `src/loader.ts` | Add `typescript: 'TypeScript'` to `LANG_HEADING` |
| `tests/loader.test.ts` | Add `typescript` to fixture + one new test |
| `templates/behavioral/strategy.md` | frontmatter + `## TypeScript` section |
| `templates/behavioral/chain-of-responsibility.md` | frontmatter + `## TypeScript` section |
| `templates/behavioral/command.md` | frontmatter + `## TypeScript` section |
| `templates/behavioral/interpreter.md` | frontmatter + `## TypeScript` section |
| `templates/behavioral/iterator.md` | frontmatter + `## TypeScript` section |
| `templates/behavioral/mediator.md` | frontmatter + `## TypeScript` section |
| `templates/behavioral/memento.md` | frontmatter + `## TypeScript` section |
| `templates/behavioral/observer.md` | frontmatter + `## TypeScript` section |
| `templates/behavioral/state.md` | frontmatter + `## TypeScript` section |
| `templates/behavioral/template-method.md` | frontmatter + `## TypeScript` section |
| `templates/behavioral/visitor.md` | frontmatter + `## TypeScript` section |
| `templates/creational/abstract-factory.md` | frontmatter + `## TypeScript` section |
| `templates/creational/builder.md` | frontmatter + `## TypeScript` section |
| `templates/creational/factory-method.md` | frontmatter + `## TypeScript` section |
| `templates/creational/prototype.md` | frontmatter + `## TypeScript` section |
| `templates/creational/singleton.md` | frontmatter + `## TypeScript` section |
| `templates/structural/adapter.md` | frontmatter + `## TypeScript` section |
| `templates/structural/bridge.md` | frontmatter + `## TypeScript` section |
| `templates/structural/composite.md` | frontmatter + `## TypeScript` section |
| `templates/structural/decorator.md` | frontmatter + `## TypeScript` section |
| `templates/structural/facade.md` | frontmatter + `## TypeScript` section |
| `templates/structural/flyweight.md` | frontmatter + `## TypeScript` section |
| `templates/structural/proxy.md` | frontmatter + `## TypeScript` section |
| `templates/modern/circuit-breaker.md` | frontmatter + `## TypeScript` section |
| `templates/modern/cqrs.md` | frontmatter + `## TypeScript` section |
| `templates/modern/dependency-injection.md` | frontmatter + `## TypeScript` section |
| `templates/modern/event-sourcing.md` | frontmatter + `## TypeScript` section |
| `templates/modern/pub-sub.md` | frontmatter + `## TypeScript` section |
| `templates/modern/repository.md` | frontmatter + `## TypeScript` section |
| `templates/modern/retry-backoff.md` | frontmatter + `## TypeScript` section |
| `templates/modern/saga.md` | frontmatter + `## TypeScript` section |
| `templates/architectural/clean-architecture.md` | frontmatter + `## TypeScript` section |
| `templates/architectural/event-driven.md` | frontmatter + `## TypeScript` section |
| `templates/architectural/hexagonal.md` | frontmatter + `## TypeScript` section |
| `templates/architectural/layered.md` | frontmatter + `## TypeScript` section |
| `templates/architectural/microservices.md` | frontmatter + `## TypeScript` section |
| `templates/architectural/mvc-mvp-mvvm.md` | frontmatter + `## TypeScript` section |
| `templates/architectural/pipe-and-filter.md` | frontmatter + `## TypeScript` section |
| `README.md` | Add `"typescript"` to language enum in Tools section |

---

### Task 1: Core loader + test (TDD)

**Files:**
- Modify: `src/loader.ts`
- Modify: `tests/loader.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/loader.test.ts`, make two edits:

**Edit 1** — add `typescript` to the fixture's `languages` array (line 12) and append the TypeScript section after the Python block (after line 51):

```
languages: [go, python, typescript, generic]
```

Append before the closing backtick of the FIXTURE string (after the Python block):

```markdown

## TypeScript
### Notes
- TypeScript test note

### Example Structure
\`\`\`typescript
const ts = 'TypeScript test';
\`\`\`
```

**Edit 2** — add a new test after the existing `'parses Go language section notes'` test:

```typescript
it('parses TypeScript language section notes', () => {
  const { patternIndex } = loadTemplates(tmpDir);
  const entry = patternIndex.get('testpattern')!;
  expect(entry.languageSections.get('typescript')!.notes).toContain('TypeScript test note');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
npx jest tests/loader.test.ts --no-coverage 2>&1 | tail -20
```

Expected: test `'parses TypeScript language section notes'` FAILS (TypeScript section not yet parsed).

- [ ] **Step 3: Add `typescript` to `LANG_HEADING` in `src/loader.ts`**

Change the `LANG_HEADING` constant (lines 7–13) to:

```typescript
const LANG_HEADING: Record<string, string> = {
  generic: 'Generic',
  go: 'Go',
  java: 'Java',
  python: 'Python',
  rust: 'Rust',
  typescript: 'TypeScript',
};
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
npx jest --no-coverage 2>&1 | tail -10
```

Expected: all tests pass (was 27, now 28).

- [ ] **Step 5: Commit**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
git add src/loader.ts tests/loader.test.ts
git commit -m "feat: add typescript to LANG_HEADING and loader tests"
```

---

### Task 2: Behavioral — Strategy (reference template)

**Files:**
- Modify: `templates/behavioral/strategy.md`

This template is implemented first as the end-to-end reference. After this task, run the integration test to confirm TypeScript parsing works on a real template.

- [ ] **Step 1: Update frontmatter and add TypeScript section**

In `templates/behavioral/strategy.md`:

**Frontmatter change** — replace `languages: [go, java, python, rust, generic]` with:
```yaml
languages: [go, java, python, rust, typescript, generic]
```

**Append at end of file:**

```markdown

## TypeScript

### Notes
- Define single-method stateless strategies as function types: `type SortStrategy = (data: number[]) => number[]` — no interface or class needed.
- Multi-method or stateful strategies: use an `interface` with structural typing — no `implements` declaration required.
- Inject via constructor (`constructor(private strategy: SortStrategy)`) for immutability; use a setter only when runtime switching is required.
- `Context` holds a field typed to the function type or interface; calling it is `this.strategy(params)` or `this.strategy.execute(params)`.

### Example Structure
```typescript
type Sorter = (data: number[]) => number[];

class SortContext {
  constructor(private strategy: Sorter) {}
  setStrategy(s: Sorter): void { this.strategy = s; }
  run(data: number[]): number[] { return this.strategy(data); }
}

// Usage — any function with the right signature is a valid strategy
const ctx = new SortContext(data => [...data].sort((a, b) => a - b));
ctx.run([3, 1, 2]); // [1, 2, 3]

// Interface-based for stateful strategies
interface PricingStrategy { calculate(basePrice: number): number; }
class DiscountStrategy implements PricingStrategy {
  constructor(private pct: number) {}
  calculate(base: number): number { return base * (1 - this.pct); }
}
```
```

- [ ] **Step 2: Verify integration — TypeScript section is parsed from real template**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
npx jest --no-coverage 2>&1 | tail -10
```

Expected: all 28 tests still pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
git add templates/behavioral/strategy.md
git commit -m "feat: add TypeScript section to strategy template"
```

---

### Task 3: Behavioral — remaining 10 templates

**Files:**
- Modify: `templates/behavioral/chain-of-responsibility.md`
- Modify: `templates/behavioral/command.md`
- Modify: `templates/behavioral/interpreter.md`
- Modify: `templates/behavioral/iterator.md`
- Modify: `templates/behavioral/mediator.md`
- Modify: `templates/behavioral/memento.md`
- Modify: `templates/behavioral/observer.md`
- Modify: `templates/behavioral/state.md`
- Modify: `templates/behavioral/template-method.md`
- Modify: `templates/behavioral/visitor.md`

For each file: (1) change `languages: [go, java, python, rust, generic]` → `languages: [go, java, python, rust, typescript, generic]` in frontmatter, (2) append the TypeScript section shown below.

- [ ] **Step 1: Update `chain-of-responsibility.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Optional chaining for pass-through: `return this.next?.handle(req) ?? null` — no null-guard boilerplate.
- Structural typing: any object with `handle` and `setNext` satisfies the `Handler` interface without extending a base class.
- For Express/Koa-style middleware, the pattern is `(req, res, next) => void` — built into the framework routing layer.
- Async chains: `async handle(req: Request): Promise<Response | null>` and `await this.next?.handle(req)` compose naturally.

### Example Structure
```typescript
interface Handler {
  setNext(h: Handler): Handler;
  handle(req: Request): Response | null;
}

abstract class AbstractHandler implements Handler {
  private next: Handler | null = null;
  setNext(h: Handler): Handler { this.next = h; return h; }
  handle(req: Request): Response | null { return this.next?.handle(req) ?? null; }
}

class AuthHandler extends AbstractHandler {
  handle(req: Request): Response | null {
    if (!req.headers.authorization) return { status: 401, body: 'Unauthorized' };
    return super.handle(req);
  }
}

class RateLimitHandler extends AbstractHandler {
  handle(req: Request): Response | null {
    if (isRateLimited(req)) return { status: 429, body: 'Too Many Requests' };
    return super.handle(req);
  }
}

// Wiring: auth.setNext(rateLimit).setNext(businessHandler)
```
```

- [ ] **Step 2: Update `command.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Model commands as plain objects (`{ type: 'TurnOn'; targetId: string }`) for serialization-friendly command buses.
- Discriminated unions allow exhaustive type-checking of command types in a dispatcher switch statement.
- Undo/redo: store immutable snapshots in an array rather than implementing `undo()` methods on commands.
- `async execute(): Promise<void>` is standard; async commands compose naturally with `await queue.run(cmd)`.

### Example Structure
```typescript
interface Command { execute(): void; undo(): void; }

class Light {
  private on = false;
  turnOn()  { this.on = true; }
  turnOff() { this.on = false; }
  isOn()    { return this.on; }
}

class TurnOnCommand implements Command {
  constructor(private light: Light) {}
  execute() { this.light.turnOn(); }
  undo()    { this.light.turnOff(); }
}

class CommandQueue {
  private history: Command[] = [];
  run(cmd: Command): void { cmd.execute(); this.history.push(cmd); }
  undo(): void             { this.history.pop()?.undo(); }
}

// Usage
const light = new Light();
const queue = new CommandQueue();
queue.run(new TurnOnCommand(light)); // on
queue.undo();                        // off
```
```

- [ ] **Step 3: Update `interpreter.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Discriminated unions model expression ASTs without class hierarchies: `type Expr = { kind: 'literal'; val: number } | { kind: 'add'; left: Expr; right: Expr }`.
- A recursive function over the discriminated union is more idiomatic than a Visitor class hierarchy for closed expression sets.
- TypeScript's `switch` exhaustiveness check (`default: expr satisfies never`) ensures all expression types are handled.
- Use `Map<string, number>` as the context/environment for variable-binding interpreters.

### Example Structure
```typescript
type Expr =
  | { kind: 'literal'; val: number }
  | { kind: 'add'; left: Expr; right: Expr }
  | { kind: 'mul'; left: Expr; right: Expr };

function evaluate(expr: Expr, env: Map<string, number> = new Map()): number {
  switch (expr.kind) {
    case 'literal': return expr.val;
    case 'add':     return evaluate(expr.left, env) + evaluate(expr.right, env);
    case 'mul':     return evaluate(expr.left, env) * evaluate(expr.right, env);
    default:        return expr satisfies never;
  }
}

// Usage: (3 + 4) * 2
const ast: Expr = { kind: 'mul', left: { kind: 'add', left: { kind: 'literal', val: 3 }, right: { kind: 'literal', val: 4 } }, right: { kind: 'literal', val: 2 } };
evaluate(ast); // 14
```
```

- [ ] **Step 4: Update `iterator.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Implement `Symbol.iterator` and the `Iterable<T>` / `Iterator<T>` interfaces — built into the language; `for...of`, spread, and destructuring all consume them.
- Generator functions (`function* gen(): Generator<T>`) are the idiomatic factory for custom iterators.
- Async iterators (`AsyncIterable<T>`) and `for await...of` for streaming or paginated data sources.
- TypeScript's `IterableIterator<T>` combines both interfaces — generators implement it by default.

### Example Structure
```typescript
class NumberRange implements Iterable<number> {
  constructor(private start: number, private end: number) {}

  [Symbol.iterator](): Iterator<number> {
    let current = this.start;
    const end = this.end;
    return {
      next(): IteratorResult<number> {
        return current < end
          ? { value: current++, done: false }
          : { value: 0,         done: true  };
      },
    };
  }
}

// Generator-based (more idiomatic)
function* range(start: number, end: number): Generator<number> {
  for (let i = start; i < end; i++) yield i;
}

for (const n of new NumberRange(1, 4)) console.log(n); // 1, 2, 3
console.log([...range(1, 4)]);                          // [1, 2, 3]
```
```

- [ ] **Step 5: Update `mediator.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Node.js `EventEmitter` is a natural Mediator for event-based communication between server-side components.
- For typed events, use `eventemitter3` with a `type Events = { 'user:created': [User] }` type parameter to eliminate stringly-typed event names.
- React Context API is the idiomatic mediator for UI component communication without prop drilling.
- NestJS `EventEmitter2` with `@OnEvent('order.placed')` decorators is the idiomatic mediator for NestJS services.

### Example Structure
```typescript
import EventEmitter from 'eventemitter3';

type AppEvents = {
  'order:placed':   [orderId: string, amount: number];
  'payment:failed': [orderId: string, reason: string];
};

const bus = new EventEmitter<AppEvents>();

// Publisher
bus.emit('order:placed', 'order-123', 99.99);

// Subscribers (each component registers independently)
bus.on('order:placed', (orderId, amount) => {
  console.log(`New order ${orderId} for $${amount}`);
});

bus.on('order:placed', (orderId) => {
  inventoryService.reserve(orderId);
});
```
```

- [ ] **Step 6: Update `memento.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Store plain object snapshots (`const snapshot = { ...state }` or `structuredClone(state)`) instead of Memento class instances.
- `Readonly<T>` and `readonly` property modifiers enforce that saved state cannot be mutated externally.
- `structuredClone()` (Node 17+) for deep snapshots of complex state without custom serialization code.
- Undo/redo stacks: `const history: ReadonlyArray<State> = []` with append-only updates keeps snapshots immutable.

### Example Structure
```typescript
type EditorState = Readonly<{ text: string; cursorPos: number }>;

class Editor {
  private state: EditorState = { text: '', cursorPos: 0 };

  type(chars: string): void {
    this.state = { text: this.state.text + chars, cursorPos: this.state.cursorPos + chars.length };
  }
  save(): EditorState    { return { ...this.state }; }         // shallow clone is safe — state is flat
  restore(s: EditorState): void { this.state = s; }
  getText(): string      { return this.state.text; }
}

class History {
  private stack: EditorState[] = [];
  push(s: EditorState): void        { this.stack.push(s); }
  pop(): EditorState | undefined    { return this.stack.pop(); }
}

// Usage
const editor = new History();
const e = new Editor();
editor.push(e.save());
e.type('Hello');
e.restore(editor.pop()!); // undo
```
```

- [ ] **Step 7: Update `observer.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Node.js `EventEmitter` is the standard Observer for server-side TypeScript — `on`, `emit`, `off` built in.
- For typed, composable reactive streams: RxJS `Subject<T>` and `Observable<T>` are idiomatic in Angular and complex event pipelines.
- Strongly type events with `eventemitter3`: `new EventEmitter<{ 'price:changed': [number] }>()` eliminates stringly-typed names.
- Clean up with `emitter.off(event, handler)` in teardown (`useEffect` cleanup, `onDestroy`) to prevent memory leaks.

### Example Structure
```typescript
import { EventEmitter } from 'events';

class StockTicker extends EventEmitter {
  private price = 0;

  setPrice(price: number): void {
    this.price = price;
    this.emit('price:changed', price);
  }
  getPrice(): number { return this.price; }
}

// Observers attach at runtime
const ticker = new StockTicker();
const alertHandler = (price: number) => {
  if (price > 500) console.warn(`High price: ${price}`);
};
ticker.on('price:changed', alertHandler);
ticker.on('price:changed', (p) => console.log(`Current price: ${p}`));

ticker.setPrice(600); // both handlers fire
ticker.off('price:changed', alertHandler); // unsubscribe
```
```

- [ ] **Step 8: Update `state.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Prefer discriminated unions (`type State = 'idle' | 'loading' | 'success' | 'error'`) over class hierarchies for simple, finite state machines.
- Complex state machines with guards, parallel states, or history: use the `xstate` library.
- TypeScript `switch` exhaustiveness (`default: state satisfies never`) ensures every state is handled at compile time.
- For class-based state, structural typing means concrete state classes don't need to `extend` a base — just satisfy the `StateHandler` interface.

### Example Structure
```typescript
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface StateHandler {
  connect(ctx: Connection): void;
  disconnect(ctx: Connection): void;
}

const stateHandlers: Record<ConnectionState, StateHandler> = {
  disconnected: { connect: ctx => ctx.transition('connecting'), disconnect: () => {} },
  connecting:   { connect: () => {},                           disconnect: ctx => ctx.transition('disconnected') },
  connected:    { connect: () => {},                           disconnect: ctx => ctx.transition('disconnected') },
  error:        { connect: ctx => ctx.transition('connecting'), disconnect: ctx => ctx.transition('disconnected') },
};

class Connection {
  private state: ConnectionState = 'disconnected';
  transition(s: ConnectionState): void { this.state = s; }
  connect():    void { stateHandlers[this.state].connect(this); }
  disconnect(): void { stateHandlers[this.state].disconnect(this); }
}
```
```

- [ ] **Step 9: Update `template-method.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Abstract classes with abstract methods are well-supported in TypeScript — use `abstract class` and `abstract method()`.
- `protected` modifier enforces the template structure: subclasses override hooks but cannot call the template method bypass.
- Functional alternative: pass hook functions as constructor parameters (`{ validate, transform }`) to avoid inheritance entirely.
- Generics (`abstract class Processor<TIn, TOut>`) make template methods type-safe across different data shapes.

### Example Structure
```typescript
abstract class ReportGenerator<TRaw, TProcessed> {
  // Template method — do not override
  generate(raw: TRaw): string {
    const validated  = this.validate(raw);
    const processed  = this.transform(validated);
    return this.format(processed);
  }

  protected abstract validate(raw: TRaw): TRaw;
  protected abstract transform(data: TRaw): TProcessed;
  protected format(data: TProcessed): string { return JSON.stringify(data); } // optional override
}

class CSVReportGenerator extends ReportGenerator<string[], Record<string, string>[]> {
  protected validate(rows: string[]): string[]        { return rows.filter(r => r.trim()); }
  protected transform(rows: string[]): Record<string, string>[] { return rows.map(parseCSVRow); }
  protected override format(data: Record<string, string>[]): string { return toCSV(data); }
}
```
```

- [ ] **Step 10: Update `visitor.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Prefer discriminated unions + functions over Visitor class hierarchies for **closed** element sets — exhaustiveness checking is free.
- `switch` on `element.kind` with `default: element satisfies never` ensures all element types are handled at compile time.
- For **open** element sets (extensible types), use `element.accept(visitor)` dispatch with a `Visitor` interface to keep elements and operations decoupled.
- This approach applies cleanly to AST transforms, code analysis tools, schema validators, and domain model traversals.

### Example Structure
```typescript
// Closed element set — discriminated union approach (preferred)
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect';   width: number; height: number };

// Each "visitor" is a function — no class hierarchy needed
function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'rect':   return shape.width * shape.height;
    default:       return shape satisfies never; // compile error if a variant is missing
  }
}

function perimeter(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return 2 * Math.PI * shape.radius;
    case 'rect':   return 2 * (shape.width + shape.height);
    default:       return shape satisfies never;
  }
}
```
```

- [ ] **Step 11: Run tests**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
npx jest --no-coverage 2>&1 | tail -10
```

Expected: all 28 tests pass.

- [ ] **Step 12: Commit**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
git add templates/behavioral/
git commit -m "feat: add TypeScript sections to behavioral templates"
```

---

### Task 4: Creational templates (5 files)

**Files:**
- Modify: `templates/creational/abstract-factory.md`
- Modify: `templates/creational/builder.md`
- Modify: `templates/creational/factory-method.md`
- Modify: `templates/creational/prototype.md`
- Modify: `templates/creational/singleton.md`

For each file: change frontmatter `languages` array to add `typescript` before `generic`, and append the TypeScript section.

- [ ] **Step 1: Update `abstract-factory.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Factory naturally expressed as a plain object literal: `const darkTheme: UIFactory = { createButton: () => ..., createCheckbox: () => ... }`.
- Structural typing: any object matching the `UIFactory` interface shape is a valid factory — no `implements` keyword required.
- Module-level factory `const`s are tree-shakeable; bundlers eliminate unused factory variants.
- Functional factory: `function createUIFactory(theme: 'light' | 'dark'): UIFactory` — a factory function returning the factory object.

### Example Structure
```typescript
interface Button   { render(): string; }
interface Checkbox { render(): string; }
interface UIFactory {
  createButton():   Button;
  createCheckbox(): Checkbox;
}

const lightTheme: UIFactory = {
  createButton:   () => ({ render: () => '<button class="light">Click</button>' }),
  createCheckbox: () => ({ render: () => '<input type="checkbox" class="light">' }),
};

const darkTheme: UIFactory = {
  createButton:   () => ({ render: () => '<button class="dark">Click</button>' }),
  createCheckbox: () => ({ render: () => '<input type="checkbox" class="dark">' }),
};

function renderForm(factory: UIFactory): string {
  return factory.createButton().render() + factory.createCheckbox().render();
}
```
```

- [ ] **Step 2: Update `builder.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Method chaining with `this` return types (`add(x: T): this`) works correctly in subclasses without covariant return type issues.
- Immutable builders: return `new Builder({ ...this.state, [key]: value })` from each setter to avoid shared mutable state.
- `Required<BuilderState>` in the `build()` signature enforces all required fields have been set before building.
- For simple config objects a plain `Partial<Config>` accumulator with a final `validate()` is often simpler than a full Builder class.

### Example Structure
```typescript
class QueryBuilder {
  private state: { table?: string; conditions: string[]; limitVal?: number } = { conditions: [] };

  from(table: string): this             { this.state.table = table; return this; }
  where(condition: string): this        { this.state.conditions.push(condition); return this; }
  limit(n: number): this                { this.state.limitVal = n; return this; }

  build(): string {
    if (!this.state.table) throw new Error('table is required');
    let q = `SELECT * FROM ${this.state.table}`;
    if (this.state.conditions.length) q += ` WHERE ${this.state.conditions.join(' AND ')}`;
    if (this.state.limitVal)          q += ` LIMIT ${this.state.limitVal}`;
    return q;
  }
}

// Usage
const sql = new QueryBuilder()
  .from('users')
  .where('active = true')
  .where('role = \'admin\'')
  .limit(10)
  .build();
// SELECT * FROM users WHERE active = true AND role = 'admin' LIMIT 10
```
```

- [ ] **Step 3: Update `factory-method.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- A `create(type: 'email' | 'sms' | 'push'): Notification` function is often more idiomatic than a Factory Method class hierarchy.
- Discriminated union of channel types enables exhaustive type checking in the factory switch.
- `Record<NotificationChannel, () => Notification>` maps channels to factories without a switch statement.
- Abstract creator classes add value when factories need shared pre/post-processing logic; otherwise prefer plain functions.

### Example Structure
```typescript
interface Notification { send(message: string): Promise<void>; }

type Channel = 'email' | 'sms' | 'push';

// Function-based factory (idiomatic)
function createNotification(channel: Channel): Notification {
  switch (channel) {
    case 'email': return { send: async (msg) => emailClient.send(msg) };
    case 'sms':   return { send: async (msg) => smsClient.send(msg) };
    case 'push':  return { send: async (msg) => pushClient.send(msg) };
  }
}

// Map-based factory (no switch)
const factories: Record<Channel, () => Notification> = {
  email: () => ({ send: async (msg) => emailClient.send(msg) }),
  sms:   () => ({ send: async (msg) => smsClient.send(msg) }),
  push:  () => ({ send: async (msg) => pushClient.send(msg) }),
};

function createNotificationV2(channel: Channel): Notification {
  return factories[channel]();
}
```
```

- [ ] **Step 4: Update `prototype.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- `structuredClone()` (Node 17+) is the standard deep-clone for plain objects and most built-in types — no custom code needed.
- Object spread (`{ ...original }`) for shallow clones; add nested spread for one-level-deep clones.
- Class-based prototype: implement `clone(): this` using `Object.assign(Object.create(Object.getPrototypeOf(this)), this)`.
- Generic clone utility: `function clone<T>(obj: T): T { return structuredClone(obj); }` — preserves type information without casting.

### Example Structure
```typescript
// Plain object clone — idiomatic for most cases
const original = { host: 'localhost', port: 5432, options: { ssl: false } };
const copy = structuredClone(original); // deep clone
copy.options.ssl = true; // does not affect original

// Class-based prototype
class ServerConfig {
  constructor(
    public host: string,
    public port: number,
    public options: Record<string, unknown> = {},
  ) {}

  clone(): ServerConfig {
    return Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      { ...this, options: { ...this.options } },
    ) as ServerConfig;
  }
}

const prod  = new ServerConfig('db.prod.example', 5432, { ssl: true });
const local = prod.clone();
local.host  = 'localhost';
local.options.ssl = false;
```
```

- [ ] **Step 5: Update `singleton.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Module-level `export const instance = new MyClass()` is the idiomatic TypeScript singleton — the Node.js module cache guarantees a single instance.
- Class-based singleton with `private constructor` + `static getInstance()` is legacy style; use only when lazy initialization is strictly required.
- For testability: dependency-inject the singleton rather than importing it directly in production code.
- `Object.freeze(instance)` prevents accidental mutation of singleton state in a shared module.

### Example Structure
```typescript
// Idiomatic — module-level singleton
// database.ts
class DatabaseConnection {
  private constructor(private readonly url: string) {}
  query(sql: string) { /* ... */ }

  static create(url: string): DatabaseConnection { return new DatabaseConnection(url); }
}

export const db = DatabaseConnection.create(process.env.DATABASE_URL!);

// Usage in any other module
import { db } from './database';
db.query('SELECT 1');

// Class-based (legacy — use only when lazy init is needed)
class Registry {
  private static instance: Registry | null = null;
  private constructor(private data = new Map<string, string>()) {}

  static getInstance(): Registry {
    return Registry.instance ??= new Registry();
  }
  get(key: string): string | undefined { return this.data.get(key); }
}
```
```

- [ ] **Step 6: Run tests**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
npx jest --no-coverage 2>&1 | tail -10
```

Expected: all 28 tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
git add templates/creational/
git commit -m "feat: add TypeScript sections to creational templates"
```

---

### Task 5: Structural templates (7 files)

**Files:**
- Modify: `templates/structural/adapter.md`
- Modify: `templates/structural/bridge.md`
- Modify: `templates/structural/composite.md`
- Modify: `templates/structural/decorator.md`
- Modify: `templates/structural/facade.md`
- Modify: `templates/structural/flyweight.md`
- Modify: `templates/structural/proxy.md`

For each file: change frontmatter `languages` array to add `typescript` before `generic`, and append the TypeScript section.

- [ ] **Step 1: Update `adapter.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Structural typing: adapters only need to satisfy the target interface shape — no `implements` declaration required.
- Object literal adapters (`const adapter: TargetInterface = { method: args => adaptee.otherMethod(args) }`) are concise and testable.
- `Partial<TargetInterface>` adapters useful when only some target interface methods need adapting.
- Generic adapters: `function adapt<S, T>(source: S, mapping: (s: S) => T): T` for one-off type conversions.

### Example Structure
```typescript
// Target interface (what your application expects)
interface Logger { log(level: 'info' | 'error', message: string): void; }

// Adaptee (third-party library — cannot modify)
interface WinstonLike {
  info(msg: string): void;
  error(msg: string): void;
}

// Object-literal adapter — structural typing means no 'implements' needed
function adaptWinston(winston: WinstonLike): Logger {
  return {
    log: (level, message) =>
      level === 'error' ? winston.error(message) : winston.info(message),
  };
}

// Class adapter (when shared state or multiple methods are needed)
class WinstonAdapter implements Logger {
  constructor(private winston: WinstonLike) {}
  log(level: 'info' | 'error', message: string): void {
    this.winston[level](message);
  }
}
```
```

- [ ] **Step 2: Update `bridge.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Bridge via constructor injection: abstraction (`Shape`) holds a reference to the implementation interface (`Renderer`) — no class coupling.
- TypeScript generics (`class Shape<R extends Renderer>`) can make the bridge explicit in the type signature.
- Structural typing: any object matching the `Renderer` interface shape is a valid implementation — swap at runtime without casting.
- Functional alternative: pass the implementation as a callback parameter instead of storing it as a class field.

### Example Structure
```typescript
interface Renderer {
  renderShape(type: string, color: string, size: number): void;
}

class SVGRenderer implements Renderer {
  renderShape(type: string, color: string, size: number): void {
    console.log(`<${type} fill="${color}" size="${size}" />`);
  }
}

class CanvasRenderer implements Renderer {
  renderShape(type: string, color: string, size: number): void {
    console.log(`ctx.fillStyle = '${color}'; ctx.draw${type}(${size})`);
  }
}

abstract class Shape {
  constructor(protected renderer: Renderer) {}
  abstract draw(): void;
}

class Circle extends Shape {
  constructor(renderer: Renderer, private color: string, private radius: number) {
    super(renderer);
  }
  draw(): void { this.renderer.renderShape('circle', this.color, this.radius); }
}

// Bridge: Circle works with either renderer without knowing which
const c = new Circle(new SVGRenderer(), 'red', 50);
c.draw(); // <circle fill="red" size="50" />
```
```

- [ ] **Step 3: Update `composite.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Common interface for leaf and composite types; TypeScript discriminates them via type guards or union literal fields.
- `Readonly<T>` and `readonly children` prevent accidental structural mutation after assembly.
- Recursive `size()` / `render()` methods are naturally typed — TypeScript infers return types across the recursion.
- For serialization/deserialization, a discriminated union (`type Node = FileNode | DirNode`) with `kind` field simplifies `JSON.parse` typing.

### Example Structure
```typescript
interface FileSystemItem {
  readonly name: string;
  size(): number;
  print(indent?: number): void;
}

class File implements FileSystemItem {
  constructor(readonly name: string, private bytes: number) {}
  size(): number                { return this.bytes; }
  print(indent = 0): void       { console.log(' '.repeat(indent) + this.name); }
}

class Directory implements FileSystemItem {
  private children: FileSystemItem[] = [];
  constructor(readonly name: string) {}
  add(item: FileSystemItem): void { this.children.push(item); }
  size(): number                  { return this.children.reduce((sum, c) => sum + c.size(), 0); }
  print(indent = 0): void {
    console.log(' '.repeat(indent) + this.name + '/');
    this.children.forEach(c => c.print(indent + 2));
  }
}
```
```

- [ ] **Step 4: Update `decorator.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- `@decorator` syntax (Stage 3 proposal, TypeScript 5+ / enabled by default in Angular, NestJS) is idiomatic for cross-cutting concerns.
- `Proxy`-based decorators: `new Proxy(target, { get: trap })` intercept method calls without modifying the original class.
- Functional decorators: `function withLogging<T extends (...args: any[]) => any>(fn: T): T` wrap any function generically.
- Object composition: `const cached = withCache(new Repository())` returns a `Repository`-shaped object, satisfying structural typing.

### Example Structure
```typescript
// Proxy-based decorator (object composition, no class modification)
function withLogging<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value === 'function') {
        return function (...args: unknown[]) {
          console.log(`Calling ${String(prop)}`, args);
          const result = value.apply(obj, args);
          console.log(`${String(prop)} returned`, result);
          return result;
        };
      }
      return value;
    },
  });
}

// @decorator syntax (TypeScript 5+, NestJS/Angular)
function log(target: object, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value as (...args: unknown[]) => unknown;
  descriptor.value = function (...args: unknown[]) {
    console.log(`${key}(${args})`);
    return original.apply(this, args);
  };
}
```
```

- [ ] **Step 5: Update `facade.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Async facade: all methods `async`, `await`ing multiple subsystem calls; callers see a simple `Promise<Result>`.
- `private readonly` subsystem dependencies injected via constructor — enables testing with mock implementations.
- For NestJS: a Facade is typically a Service that orchestrates multiple other Services or repositories.
- TypeScript discriminated union return types (`Promise<{ ok: true; data: D } | { ok: false; error: string }>`) make facade errors explicit.

### Example Structure
```typescript
class OrderFacade {
  constructor(
    private readonly inventory: InventoryService,
    private readonly payment: PaymentService,
    private readonly shipping: ShippingService,
    private readonly notifications: NotificationService,
  ) {}

  async placeOrder(order: PlaceOrderRequest): Promise<OrderConfirmation> {
    await this.inventory.reserve(order.items);
    const charge = await this.payment.charge({
      amount: order.total,
      method: order.paymentMethod,
    });
    const tracking = await this.shipping.schedule(order.address, order.items);
    await this.notifications.sendConfirmation(order.customerId, tracking.number);

    return {
      orderId:        order.id,
      chargeId:       charge.id,
      trackingNumber: tracking.number,
    };
  }
}
```
```

- [ ] **Step 6: Update `flyweight.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Flyweight intrinsic state: `readonly` constructor parameters + `Object.freeze()` ensure shared state is never mutated.
- Pool implemented as `Map<string, Flyweight>` — key is the serialized intrinsic state.
- TypeScript distinguishes intrinsic (constructor params, shared) from extrinsic (method params, unique per call) at the type level.
- `WeakRef` + `FinalizationRegistry` for pools where entries should be garbage-collected when no longer referenced.

### Example Structure
```typescript
// Flyweight: immutable, shared intrinsic state
class CharGlyph {
  constructor(
    readonly char: string,
    readonly font: string,
    readonly size: number,
  ) { Object.freeze(this); }

  render(x: number, y: number, color: string): void {
    console.log(`Render '${this.char}' ${this.font}/${this.size} at (${x},${y}) ${color}`);
  }
}

// Factory manages the pool
class GlyphFactory {
  private pool = new Map<string, CharGlyph>();

  get(char: string, font: string, size: number): CharGlyph {
    const key = `${char}::${font}::${size}`;
    if (!this.pool.has(key)) {
      this.pool.set(key, new CharGlyph(char, font, size));
    }
    return this.pool.get(key)!;
  }

  poolSize(): number { return this.pool.size; }
}

// Extrinsic state (x, y, color) is passed per render call, not stored
const factory = new GlyphFactory();
factory.get('A', 'Arial', 12).render(10, 20, 'black');
factory.get('A', 'Arial', 12).render(30, 20, 'red'); // reuses same glyph
```
```

- [ ] **Step 7: Update `proxy.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Built-in `Proxy` object handles get/set/apply/has traps natively — no wrapper class required for common use cases.
- `Reflect.*` methods forward trapped operations to the target without losing `this` binding or prototype chain.
- Virtual proxy with lazy loading: `new Proxy({} as Service, { get: lazyInit })` delays expensive initialization until first access.
- `Proxy<T>` maintains TypeScript type safety — the proxy is typed as `T`, not a special wrapper type.

### Example Structure
```typescript
// Logging proxy — intercepts all method calls
function createLoggingProxy<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value !== 'function') return value;
      return function (...args: unknown[]) {
        console.log(`→ ${String(prop)}(${args.map(String).join(', ')})`);
        return (value as Function).apply(obj, args);
      };
    },
  });
}

// Virtual proxy — lazy initialization
function createLazyProxy<T extends object>(factory: () => T): T {
  let instance: T | null = null;
  return new Proxy({} as T, {
    get(_, prop, receiver) {
      if (!instance) instance = factory();
      return Reflect.get(instance, prop, receiver);
    },
  });
}

// Usage
const service = createLazyProxy(() => new ExpensiveService());
// ExpensiveService not created until first property access
```
```

- [ ] **Step 8: Run tests**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
npx jest --no-coverage 2>&1 | tail -10
```

Expected: all 28 tests pass.

- [ ] **Step 9: Commit**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
git add templates/structural/
git commit -m "feat: add TypeScript sections to structural templates"
```

---

### Task 6: Modern templates (8 files)

**Files:**
- Modify: `templates/modern/circuit-breaker.md`
- Modify: `templates/modern/cqrs.md`
- Modify: `templates/modern/dependency-injection.md`
- Modify: `templates/modern/event-sourcing.md`
- Modify: `templates/modern/pub-sub.md`
- Modify: `templates/modern/repository.md`
- Modify: `templates/modern/retry-backoff.md`
- Modify: `templates/modern/saga.md`

For each file: change frontmatter `languages` array to add `typescript` before `generic`, and append the TypeScript section.

- [ ] **Step 1: Update `circuit-breaker.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- `opossum` is the standard Node.js circuit breaker library — wraps any `async` function, no custom state machine needed.
- Manual implementation: closure state (`let state: 'closed' | 'open' | 'half-open'`) + an `async` wrapper function.
- `opossum` fires typed events: `'open'`, `'close'`, `'halfOpen'`, `'fallback'` — wire these to metrics/alerting.
- Combine with retry: the circuit breaker wraps the retry-wrapped function, not individual retry attempts.

### Example Structure
```typescript
import CircuitBreaker from 'opossum';

async function callPaymentService(orderId: string): Promise<PaymentResult> {
  const resp = await fetch(`https://payment-service/pay/${orderId}`, { method: 'POST' });
  if (!resp.ok) throw new Error(`Payment failed: ${resp.status}`);
  return resp.json();
}

const breaker = new CircuitBreaker(callPaymentService, {
  timeout:                  3000,  // fail after 3 s
  errorThresholdPercentage: 50,    // open after 50% errors
  resetTimeout:             30000, // retry after 30 s
});

breaker.fallback(() => ({ status: 'pending', message: 'Payment service unavailable' }));
breaker.on('open',     () => logger.warn('Payment circuit OPEN'));
breaker.on('halfOpen', () => logger.info('Payment circuit HALF-OPEN — testing'));
breaker.on('close',    () => logger.info('Payment circuit CLOSED — recovered'));

export const processPayment = (orderId: string) => breaker.fire(orderId);
```
```

- [ ] **Step 2: Update `cqrs.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Separate `Command` and `Query` type hierarchies with discriminated unions; one handler class per operation.
- NestJS CQRS module (`@nestjs/cqrs`) provides `CommandBus`, `QueryBus`, and `EventBus` infrastructure with decorators.
- Commands return `void` (or a result type for command sourcing); queries return `Promise<DTO>`.
- TypeScript generics: `interface CommandHandler<C extends Command, R = void>` ties each command to its return type at the type level.

### Example Structure
```typescript
// Command side
interface Command { readonly _type: string; }

class PlaceOrderCommand implements Command {
  readonly _type = 'PlaceOrder';
  constructor(readonly customerId: string, readonly items: OrderItem[]) {}
}

interface CommandHandler<C extends Command, R = void> {
  handle(command: C): Promise<R>;
}

class PlaceOrderHandler implements CommandHandler<PlaceOrderCommand, string> {
  constructor(private orderRepo: OrderRepository, private events: EventBus) {}
  async handle(cmd: PlaceOrderCommand): Promise<string> {
    const order = Order.create(cmd.customerId, cmd.items);
    await this.orderRepo.save(order);
    await this.events.publish(new OrderPlacedEvent(order.id));
    return order.id;
  }
}

// Query side
interface QueryHandler<Q, R> { handle(query: Q): Promise<R>; }

class GetOrderHandler implements QueryHandler<{ orderId: string }, OrderDTO> {
  async handle(query: { orderId: string }): Promise<OrderDTO> {
    return this.readDb.findOrder(query.orderId); // read-optimized query
  }
}
```
```

- [ ] **Step 3: Update `dependency-injection.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

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
  constructor(private readonly userRepo: UserRepository, private readonly mailer: MailService) {}

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
    private readonly orderRepo: OrderRepository,    // interface, not class
    private readonly paymentGateway: PaymentGateway, // interface, not class
  ) {}
}
```
```

- [ ] **Step 4: Update `event-sourcing.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Discriminated union event types: `type OrderEvent = OrderPlaced | OrderShipped | OrderCancelled` — switch exhaustiveness is automatic.
- `readonly` event fields prevent mutation after creation; `as const` for event type string literals.
- Aggregate state rebuilt by replaying a `DomainEvent[]` array through an `apply(event: DomainEvent)` method.
- `eventstore-client` for EventStoreDB; custom `events` table in PostgreSQL; snapshots for large event streams.

### Example Structure
```typescript
type OrderEvent =
  | { type: 'OrderPlaced';   orderId: string; items: Item[];    occurredAt: Date }
  | { type: 'OrderShipped';  orderId: string; trackingNo: string; occurredAt: Date }
  | { type: 'OrderCancelled'; orderId: string; reason: string;  occurredAt: Date };

type OrderState = { status: 'new' | 'placed' | 'shipped' | 'cancelled'; items: Item[] };

function applyEvent(state: OrderState, event: OrderEvent): OrderState {
  switch (event.type) {
    case 'OrderPlaced':    return { ...state, status: 'placed', items: event.items };
    case 'OrderShipped':   return { ...state, status: 'shipped' };
    case 'OrderCancelled': return { ...state, status: 'cancelled' };
  }
}

function rehydrate(events: OrderEvent[]): OrderState {
  return events.reduce(applyEvent, { status: 'new', items: [] });
}
```
```

- [ ] **Step 5: Update `pub-sub.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- `eventemitter3` for typed in-process pub/sub — define `type Events = { 'user:created': [User] }` for type-safe emit/on.
- For distributed pub/sub: `ioredis` pub/sub, BullMQ (Redis-backed queues), or NATS JetStream.
- Async subscribers: EventEmitter does not await async handlers — use a typed bus that calls `Promise.allSettled` for controlled dispatch.
- Clean up subscriptions with `emitter.off()` in teardown (`useEffect` return, `ngOnDestroy`) to prevent memory leaks.

### Example Structure
```typescript
import EventEmitter from 'eventemitter3';

// Typed event map — compile error if event name or payload type is wrong
type AppEvents = {
  'user:registered': [userId: string, email: string];
  'order:placed':    [orderId: string, total: number];
};

const bus = new EventEmitter<AppEvents>();

// Publishers
bus.emit('user:registered', 'user-123', 'alice@example.com');

// Subscribers (decoupled — no direct import of publisher)
bus.on('user:registered', (userId, email) => {
  mailerService.sendWelcome(email);
});

bus.on('user:registered', (userId) => {
  analyticsService.track('signup', { userId });
});

// Cleanup
const handler = (orderId: string) => fulfillmentService.start(orderId);
bus.on('order:placed', handler);
// later...
bus.off('order:placed', handler);
```
```

- [ ] **Step 6: Update `repository.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Always `async`/`await`; return `Promise<T | null>` for nullable lookups — not `T | undefined`.
- Define the repository interface in the domain layer; implement in the infrastructure layer (never import ORM types into domain).
- NestJS + TypeORM: `@InjectRepository(Entity)` injects a TypeORM repository; wrap it in a domain repository class.
- Generic base: `interface Repository<T, ID> { findById(id: ID): Promise<T | null>; save(entity: T): Promise<T>; }` standardizes signatures.

### Example Structure
```typescript
// Domain interface (no ORM imports)
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

// Infrastructure implementation
class PostgresUserRepository implements UserRepository {
  constructor(private db: Pool) {}

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? mapRowToUser(rows[0]) : null;
  }

  async save(user: User): Promise<User> {
    const { rows } = await this.db.query(
      `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET email = $2, name = $3 RETURNING *`,
      [user.id, user.email, user.name],
    );
    return mapRowToUser(rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}
```
```

- [ ] **Step 7: Update `retry-backoff.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Pure `async`/`await` with a `for` loop and `setTimeout` promise is idiomatic for basic retry — no extra library needed.
- `p-retry` npm package for production retry with configurable strategies, typed errors, and abort signals.
- Exponential backoff: `delay = baseMs * 2 ** (attempt - 1)` with optional jitter `+ Math.random() * baseMs`.
- Typed error filtering: `if (!(err instanceof RetryableError)) throw err` to only retry transient failures.

### Example Structure
```typescript
class RetryableError extends Error {}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 100 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof RetryableError)) throw err; // don't retry non-retryable errors
      if (attempt === maxAttempts) throw err;

      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * baseDelayMs;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('unreachable');
}

// Usage
const data = await withRetry(
  () => fetch('https://api.example.com/data').then(r => r.json()),
  { maxAttempts: 4, baseDelayMs: 200 },
);
```
```

- [ ] **Step 8: Update `saga.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Saga steps typed as `{ execute(ctx: T): Promise<void>; compensate(ctx: T): Promise<void> }` — generic over context type.
- Orchestration saga: a central async function drives steps; compensation runs in reverse on failure — `try/catch` models this naturally.
- Choreography saga: services communicate via events — use a typed event bus with discriminated union event types for exhaustiveness.
- Compensation is best-effort: wrap each `compensate()` in its own `try/catch` to prevent one failed rollback from blocking the rest.

### Example Structure
```typescript
interface SagaStep<TCtx> {
  execute(ctx: TCtx): Promise<void>;
  compensate(ctx: TCtx): Promise<void>;
}

async function runSaga<TCtx>(steps: SagaStep<TCtx>[], ctx: TCtx): Promise<void> {
  const completed: SagaStep<TCtx>[] = [];
  try {
    for (const step of steps) {
      await step.execute(ctx);
      completed.push(step);
    }
  } catch (err) {
    // Compensate in reverse order — best-effort, don't let one failure block the rest
    for (const step of [...completed].reverse()) {
      try { await step.compensate(ctx); }
      catch (compensateErr) { logger.error('Compensation failed', compensateErr); }
    }
    throw new Error(`Saga failed: ${err}`);
  }
}

// Usage
type OrderCtx = { orderId: string; chargeId?: string; trackingNo?: string };
await runSaga<OrderCtx>([
  reserveInventoryStep,
  chargePaymentStep,
  scheduleShipmentStep,
], { orderId: 'ord-123' });
```
```

- [ ] **Step 9: Run tests**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
npx jest --no-coverage 2>&1 | tail -10
```

Expected: all 28 tests pass.

- [ ] **Step 10: Commit**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
git add templates/modern/
git commit -m "feat: add TypeScript sections to modern templates"
```

---

### Task 7: Architectural templates (7 files)

**Files:**
- Modify: `templates/architectural/clean-architecture.md`
- Modify: `templates/architectural/event-driven.md`
- Modify: `templates/architectural/hexagonal.md`
- Modify: `templates/architectural/layered.md`
- Modify: `templates/architectural/microservices.md`
- Modify: `templates/architectural/mvc-mvp-mvvm.md`
- Modify: `templates/architectural/pipe-and-filter.md`

For each file: change frontmatter `languages` array to add `typescript` before `generic`, and append the TypeScript section.

- [ ] **Step 1: Update `clean-architecture.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Entity classes have zero imports from framework or infrastructure packages — enforced by directory structure and `eslint-plugin-import` rules.
- Use case classes depend only on domain entities and port interfaces (not HTTP types, ORM types, etc.).
- NestJS is the outermost adapter layer: controllers call use cases; use cases don't know about HTTP or NestJS.
- `dependency-cruiser` or `eslint-plugin-boundaries` enforce architectural layer dependencies at CI time.

### Example Structure
```typescript
// Entity (innermost — no external imports)
class Order {
  constructor(readonly id: string, readonly items: Item[], private status = 'new') {}
  place(): void { if (this.status !== 'new') throw new Error('Already placed'); this.status = 'placed'; }
  isPlaced(): boolean { return this.status === 'placed'; }
}

// Port interfaces (domain layer — no ORM/framework imports)
interface OrderRepository { save(order: Order): Promise<void>; }
interface EventPublisher  { publish(event: DomainEvent): Promise<void>; }

// Use case (depends on entities + ports only)
class PlaceOrderUseCase {
  constructor(private repo: OrderRepository, private events: EventPublisher) {}
  async execute(dto: { id: string; items: Item[] }): Promise<Order> {
    const order = new Order(dto.id, dto.items);
    order.place();
    await this.repo.save(order);
    await this.events.publish({ type: 'OrderPlaced', orderId: order.id });
    return order;
  }
}

// Adapter (outermost — NestJS controller, Express handler, etc.)
// @Controller('orders')
// class OrderController { constructor(private useCase: PlaceOrderUseCase) {} ... }
```
```

- [ ] **Step 2: Update `event-driven.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Discriminated union event types (`type AppEvent = OrderPlaced | PaymentFailed | ShipmentCreated`) provide compile-time exhaustiveness.
- `eventemitter3` with typed `Events` map for in-process events; Kafka/NATS for distributed cross-service events.
- NestJS `@OnEvent('order.placed')` decorators + `EventEmitter2` for declarative subscriptions in service classes.
- Async handlers: use a bus that awaits `Promise.allSettled` to ensure all handlers complete before continuing.

### Example Structure
```typescript
// Discriminated union — exhaustiveness guaranteed by TypeScript
type AppEvent =
  | { type: 'OrderPlaced';   orderId: string; amount: number }
  | { type: 'PaymentFailed'; orderId: string; reason: string }
  | { type: 'ShipmentCreated'; orderId: string; trackingNo: string };

class TypedEventBus {
  private handlers = new Map<string, ((e: AppEvent) => Promise<void>)[]>();

  on<T extends AppEvent['type']>(
    type: T,
    fn: (e: Extract<AppEvent, { type: T }>) => Promise<void>,
  ): void {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(type, [...existing, fn as (e: AppEvent) => Promise<void>]);
  }

  async emit(event: AppEvent): Promise<void> {
    const fns = this.handlers.get(event.type) ?? [];
    await Promise.allSettled(fns.map(fn => fn(event)));
  }
}

// Subscriber registration
const bus = new TypedEventBus();
bus.on('OrderPlaced', async ({ orderId, amount }) => {
  await inventoryService.reserve(orderId);
});
```
```

- [ ] **Step 3: Update `hexagonal.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Port interfaces defined with TypeScript `interface` in the domain layer — adapters implement via structural typing, no `implements` required.
- NestJS modules wire adapters to ports: domain module exports the port interface; infrastructure module provides the adapter implementation.
- `@Injectable()` adapters registered with NestJS DI using custom provider tokens: `{ provide: NOTIFICATION_PORT, useClass: SendGridAdapter }`.
- Constructor injection of port interfaces in application services keeps domain code entirely free of framework dependencies.

### Example Structure
```typescript
// Port (domain layer — pure TypeScript, no framework imports)
interface NotificationPort {
  send(userId: string, message: string): Promise<void>;
}

// Application service (depends only on ports)
class UserRegistrationService {
  constructor(
    private readonly userRepo: UserRepository,      // port
    private readonly notify:   NotificationPort,    // port
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const user = User.create(dto.email, dto.name);
    await this.userRepo.save(user);
    await this.notify.send(user.id, `Welcome, ${user.name}!`);
    return user;
  }
}

// Adapter (infrastructure layer — depends on external SDK)
class SendGridAdapter implements NotificationPort {
  constructor(private client: SendGridClient) {}
  async send(userId: string, message: string): Promise<void> {
    await this.client.send({ to: userId, subject: 'Welcome', text: message });
  }
}

// NestJS wiring
// { provide: NOTIFICATION_PORT, useClass: SendGridAdapter }
```
```

- [ ] **Step 4: Update `layered.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

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
    return { id: user.id, email: user.email, name: user.name }; // map Entity → DTO
  }
}

// Data layer
@Injectable()
class UserRepository {
  constructor(@InjectRepository(UserEntity) private repo: Repository<UserEntity>) {}
  async findById(id: string): Promise<UserEntity | null> { return this.repo.findOneBy({ id }); }
}
```
```

- [ ] **Step 5: Update `microservices.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Each microservice is its own Node.js process with its own `package.json`; share only generated protobuf types or OpenAPI client SDKs, not business code.
- NestJS per service — `@nestjs/microservices` for gRPC, TCP, NATS, Kafka transport between services.
- `axios` or `fetch` for inter-service HTTP; `@nestjs/microservices` `ClientProxy` for typed RPC.
- Instrument each service with structured logging (`pino`), metrics (`prom-client`), and tracing (OpenTelemetry `@opentelemetry/sdk-node`).

### Example Structure
```typescript
// order-service/src/main.ts — standalone NestJS app
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3001);
}
bootstrap();

// order-service/src/order.service.ts
@Injectable()
class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    @Inject(INVENTORY_CLIENT) private readonly inventory: ClientProxy, // gRPC/NATS client
  ) {}

  async placeOrder(dto: PlaceOrderDto): Promise<Order> {
    const order = Order.create(dto.customerId, dto.items);
    await lastValueFrom(this.inventory.send('reserve', { items: dto.items })); // sync call
    await this.orderRepo.save(order);
    return order;
  }
}
```
```

- [ ] **Step 6: Update `mvc-mvp-mvvm.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

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
```

- [ ] **Step 7: Update `pipe-and-filter.md`**

Frontmatter: add `typescript` before `generic`.

Append:

```markdown

## TypeScript

### Notes
- Async generator functions (`async function* filter(source: AsyncIterable<T>)`) are the idiomatic TypeScript pipe — lazy, composable, backpressure-aware.
- For synchronous pipelines: `Array.prototype` chains (`.map().filter().reduce()`) or plain generator functions.
- `for await...of` at the sink consumes the async pipeline without pulling all data into memory.
- `Node.js Transform streams` (`stream.Transform`) for high-throughput binary/text pipelines with built-in backpressure.

### Example Structure
```typescript
// Async generator pipeline — each filter wraps an AsyncIterable
async function* parseLines(source: AsyncIterable<Buffer>): AsyncIterable<string> {
  for await (const chunk of source) {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim()) yield line;
    }
  }
}

async function* filterErrors(source: AsyncIterable<string>): AsyncIterable<LogRecord> {
  for await (const line of source) {
    const record = parseLogLine(line);
    if (record.level === 'error') yield record;
  }
}

async function* enrichWithGeo(source: AsyncIterable<LogRecord>): AsyncIterable<EnrichedRecord> {
  for await (const record of source) {
    yield { ...record, geo: await geoLookup(record.ip) };
  }
}

// Sink — pull through the pipeline
async function writeToDB(source: AsyncIterable<EnrichedRecord>): Promise<void> {
  for await (const record of source) {
    await db.insert('logs', record);
  }
}

// Assembly — compose by wrapping
await writeToDB(enrichWithGeo(filterErrors(parseLines(fileStream))));
```
```

- [ ] **Step 8: Run tests**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
npx jest --no-coverage 2>&1 | tail -10
```

Expected: all 28 tests pass.

- [ ] **Step 9: Commit**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
git add templates/architectural/
git commit -m "feat: add TypeScript sections to architectural templates"
```

---

### Task 8: README update + build + push

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README language enum**

In `README.md`, find the `get_template` input description and update the language enum to include `"typescript"`:

```
**Input:** `{ pattern: string, language: "go"|"java"|"python"|"rust"|"typescript"|"generic" }`
```

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
npx jest --no-coverage 2>&1 | tail -15
```

Expected: all 28 tests pass.

- [ ] **Step 3: Build**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
npm run build 2>&1 | tail -10
```

Expected: `dist/index.js` updated, no TypeScript errors.

- [ ] **Step 4: Smoke-test via MCP stdio**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_template","arguments":{"pattern":"strategy","language":"typescript"}}}' \
  | node /Users/jinzuo/projects/design-pattern-mcp/dist/index.js 2>/dev/null \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['result']['content'][0]['text'][:300])"
```

Expected: output contains `## TypeScript` and TypeScript-specific notes for Strategy.

- [ ] **Step 5: Commit and push**

```bash
cd /Users/jinzuo/projects/design-pattern-mcp
git add README.md
git commit -m "feat: update README to include typescript in language enum"
git push
```
