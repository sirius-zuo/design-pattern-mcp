---
name: Pipe and Filter
category: architectural
languages: [go, java, python, rust, typescript, generic]
triggers:
  - data processing pipeline with composable steps
  - transformation steps need to be reorderable or replaceable
  - streaming data transformation
  - ETL pipeline
  - process data through a sequence of independent transformations
---

## Overview
Structures processing as a sequence of independent Filter components connected by Pipes (channels or queues). Each Filter reads from its input pipe, transforms the data, and writes to its output pipe. Filters are stateless and composable.

## Components
- **Filter**: An independent processing step. Reads input, applies a transformation or computation, and writes output. Has no knowledge of neighboring filters.
- **Pipe**: The connector between filters. Carries data from one filter's output to the next filter's input. May be a channel, queue, stream, or in-memory buffer.
- **Source (Data Pump)**: Produces the initial data stream feeding the first filter.
- **Sink**: Consumes the output of the final filter (writes to DB, emits to queue, returns result).
- **Pipeline**: Assembles sources, filters, and sink in sequence. Manages lifecycle and error propagation.

## Constraints
- Filters must be stateless (or self-contained) — they must not share mutable state with other filters.
- Filters must communicate only through their input/output pipes — no direct method calls between filters.
- Each filter must define a clear, typed input and output schema so pipeline assembly is type-safe.
- Filters must be independently testable with no dependency on other pipeline stages.

## Anti-Patterns
- Filters that read from or write to external state (DB, global variable) mid-pipeline (creates hidden coupling).
- Monolithic filter that does multiple unrelated transformations (defeats composability).
- Filters that hold references to upstream or downstream filters (bypasses pipe abstraction).
- Error handling that silently drops records — use a dead-letter pipe or explicit error output.

## Generic Example Structure
```
Source → [Pipe] → FilterA → [Pipe] → FilterB → [Pipe] → FilterC → [Pipe] → Sink

Example (log processing):
  ReadFile → ParseLine → FilterErrors → EnrichWithGeoIP → WriteToDB
```

## Go

### Notes
- Channels (`chan T`) are the natural pipe primitive; each filter is a goroutine.
- Pattern: `func FilterA(in <-chan Input) <-chan Output` — each filter returns its output channel.
- Chain filters by passing the output channel of one as the input of the next.
- Use `context.Context` for cancellation; `errgroup` for error propagation across goroutines.

### Example Structure
```go
// Filter: each takes an input channel and returns an output channel
func Parse(in <-chan []byte) <-chan Record {
    out := make(chan Record)
    go func() {
        defer close(out)
        for raw := range in {
            if r, err := parseRecord(raw); err == nil { out <- r }
        }
    }()
    return out
}

func Enrich(in <-chan Record) <-chan Record {
    out := make(chan Record)
    go func() {
        defer close(out)
        for r := range in { out <- enrichWithGeo(r) }
    }()
    return out
}

// Pipeline assembly
func BuildPipeline(source <-chan []byte) <-chan Record {
    return Enrich(Parse(source))
}
```

## Java

### Notes
- `java.util.stream.Stream` is the natural pipe-and-filter implementation for in-memory pipelines.
- For concurrent pipelines: `java.util.concurrent.BlockingQueue` as pipes between `Runnable` filter stages.
- Spring Batch implements this pattern: `ItemReader` (Source) → `ItemProcessor` (Filter) → `ItemWriter` (Sink).
- Reactive Streams (`Project Reactor`, `RxJava`) provide backpressure-aware pipe-and-filter with `Flux.map()`, `filter()`, `flatMap()`.

### Example Structure
```java
// Stream-based pipeline (in-memory)
List<EnrichedRecord> result = source.stream()
    .map(raw -> parseRecord(raw))          // Filter: parse
    .filter(r -> r.getSeverity() > ERROR)  // Filter: filter by severity
    .map(r -> enrichWithGeoIP(r))          // Filter: enrich
    .collect(Collectors.toList());          // Sink

// Concurrent pipeline with BlockingQueues
BlockingQueue<byte[]>   rawQ    = new LinkedBlockingQueue<>();
BlockingQueue<Record>   parsedQ = new LinkedBlockingQueue<>();
executor.submit(new ParseFilter(rawQ, parsedQ));
executor.submit(new EnrichFilter(parsedQ, sinkQ));
```

## Python

### Notes
- Generator functions (`yield`) are idiomatic pipes — they are lazy and composable.
- Chain generators: `sink(enrich(parse(source())))` — each wraps an iterable.
- `concurrent.futures` or `asyncio.Queue` for concurrent filter stages.
- `Apache Beam` (Python SDK) is a production-grade pipe-and-filter framework for batch and streaming.

### Example Structure
```python
# Each filter is a generator that wraps an iterable (the pipe)
def parse(raw_lines):
    for line in raw_lines:
        try:
            yield parse_record(line)
        except ParseError:
            pass  # or yield to dead-letter pipe

def filter_errors(records):
    for record in records:
        if record.severity >= ERROR:
            yield record

def enrich(records):
    for record in records:
        yield enrich_with_geo(record)

# Pipeline assembly — lazy, composable
def build_pipeline(source):
    return enrich(filter_errors(parse(source)))

# Usage
for record in build_pipeline(read_lines("access.log")):
    db.save(record)
```

## Rust

### Notes
- Iterators (`.map()`, `.filter()`, `.flat_map()`) are the zero-cost pipe-and-filter for synchronous in-memory pipelines.
- `tokio::sync::mpsc` channels for async concurrent filter stages.
- `async-stream` crate for async generator-style filters.
- `Rayon` parallel iterators (`par_iter().map().filter()`) for CPU-bound parallel pipelines.

### Example Structure
```rust
// Synchronous iterator pipeline (zero-cost)
let result: Vec<EnrichedRecord> = source
    .into_iter()
    .filter_map(|raw| parse_record(raw).ok())   // Filter: parse, discard errors
    .filter(|r| r.severity >= Severity::Error)  // Filter: by severity
    .map(|r| enrich_with_geo(r))                // Filter: enrich
    .collect();                                  // Sink

// Async concurrent pipeline (tokio channels)
let (tx_raw, rx_raw)     = mpsc::channel::<Vec<u8>>(100);
let (tx_parsed, rx_parsed) = mpsc::channel::<Record>(100);
tokio::spawn(parse_filter(rx_raw, tx_parsed));
tokio::spawn(enrich_filter(rx_parsed, tx_sink));
```

## TypeScript

### Notes
- Async generator functions (`async function* filter(source: AsyncIterable<T>)`) are the idiomatic TypeScript pipe — lazy, composable, backpressure-aware.
- For synchronous pipelines: `Array.prototype` chains (`.map().filter().reduce()`) or plain generator functions.
- `for await...of` at the sink consumes the async pipeline without pulling all data into memory.
- Node.js `Transform` streams for high-throughput binary/text pipelines with built-in backpressure.

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

// Assembly — compose by wrapping; sink pulls through the pipeline
async function writeToDB(source: AsyncIterable<EnrichedRecord>): Promise<void> {
  for await (const record of source) {
    await db.insert('logs', record);
  }
}

await writeToDB(enrichWithGeo(filterErrors(parseLines(fileStream))));
```
