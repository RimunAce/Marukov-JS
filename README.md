# marukov-js

Native Node.js bindings for [marukov](https://crates.io/crates/marukov) a fast Rust Markov chain text generator. Built with [napi-rs](https://napi.rs) for near-zero overhead between JavaScript and Rust.

## Installation

```bash
npm install marukov-js
```

Pre-built binaries are provided for:

| Platform | Architecture |
|---|---|
| Windows | x64 |
| Linux (glibc) | x64, arm64 |
| Linux (musl / Alpine) | x64 |
| macOS | x64, arm64 |

To build from source, you need a [Rust toolchain](https://rustup.rs) and `@napi-rs/cli`:

```bash
npm run build
```

## Usage

### Basic text generation

```js
import { MarkovText } from 'marukov-js'
// or: const { MarkovText } = require('marukov-js')

const corpus = `line one of your training data
line two of your training data
line three of your training data`

const model = new MarkovText(corpus)

console.log(model.generate())
// → "line two of your training data" (e.g.)
```

Each line of the corpus is treated as one training sentence.

### With options

```js
const result = model.generate({
  tries: 100,      // max attempts before returning null (default: 999)
  minWords: 4,     // minimum words in result (default: 0)
  maxWords: 12,    // maximum words in result (default: 100)
})
```

### Start from a specific word

```js
model.generateWithStart('line')
// → "line one of your training data"

// Try multiple start words, return first match
model.generateWithStarts(['unknown', 'line', 'data'])
```

### Bulk generation (parallel, rayon-powered)

```js
const sentences = model.generateMany(50)
// Returns up to 50 generated sentences using all CPU cores
```

### Async API (non-blocking)

All heavy operations have async variants that offload to the thread pool, keeping the event loop free:

```js
const result = await model.generateAsync({ maxWords: 10 })

const withStart = await model.generateWithStartAsync('line')

const bulk = await model.generateManyAsync(100)
```

### Low-level API

#### `MarkovVocab`: token ↔ string dictionary

```js
import { MarkovVocab } from 'marukov-js'

const vocab = new MarkovVocab()
const id = vocab.toToken('hello')     // 0  (adds if unseen)
vocab.toTokenOpt('world')             // null (not yet added)
vocab.toToken('world')                // 1
vocab.toWord(0)                       // "hello"
```

#### `StringChain`: low-level Markov chain over strings

```js
import { StringChain } from 'marukov-js'

const chain = StringChain.fromData(
  [['hello', 'world'], ['hello', 'there']],
  '__begin__',
  '__end__'
)

chain.generate()                        // e.g. ["hello", "world"]
chain.generate(['hello', 'world'])      // seed with a specific state
chain.findInitStates('hello')           // [["hello", "world"], ...]
chain.next(['hello', 'world'])          // e.g. "there"
```

## API Reference

### `TextOptions`

| Field | Type | Default | Description |
|---|---|---|---|
| `tries` | `number` | `999` | Max generation attempts before returning `null` |
| `minWords` | `number` | `0` | Minimum word count of returned sentence |
| `maxWords` | `number` | `100` | Maximum word count of returned sentence |

### `MarkovText`

| Method | Returns | Description |
|---|---|---|
| `new MarkovText(data)` | - | Train model on newline-separated corpus |
| `generate(options?)` | `string \| null` | Generate one sentence |
| `generateAsync(options?)` | `Promise<string \| null>` | Async generate |
| `generateWithStart(start, options?)` | `string \| null` | Generate starting from a word |
| `generateWithStartAsync(start, options?)` | `Promise<string \| null>` | Async |
| `generateWithStarts(starts[], options?)` | `string \| null` | Try each start word in order |
| `generateMany(count, options?)` | `string[]` | Generate `count` sentences in parallel |
| `generateManyAsync(count, options?)` | `Promise<string[]>` | Async parallel bulk generation |

### `MarkovVocab`

| Method | Returns | Description |
|---|---|---|
| `new MarkovVocab()` | - | Empty vocabulary |
| `toToken(word)` | `number` | Get or assign token ID for a word |
| `toTokenOpt(word)` | `number \| null` | Look up token ID without adding |
| `toWord(token)` | `string` | Reverse lookup: token → word |

### `StringChain`

| Method | Returns | Description |
|---|---|---|
| `StringChain.createEmpty(begin, end)` | `StringChain` | Empty chain |
| `StringChain.fromData(data, begin, end)` | `StringChain` | Train on `string[][]` sequences |
| `next(state)` | `string` | Get next token from state (throws if unknown) |
| `generate(initState?)` | `string[]` | Generate sequence from optional seed state |
| `findInitStates(start)` | `string[][]` | Find all states containing a token |

## License

MIT LICENSE. see [LICENSE](LICENSE).

Built on top of [marukov](https://github.com/xjunko/marukov) by [xjunko](https://github.com/xjunko).
