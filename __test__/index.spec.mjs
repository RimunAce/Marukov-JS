import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { MarkovText, MarkovVocab, StringChain } = require('../index.js')

const CORPUS = [
  'the quick brown fox jumps over the lazy dog',
  'the quick brown fox ran through the green forest',
  'the lazy dog slept under the old oak tree',
  'a brown fox and a lazy dog became good friends',
  'quick animals like foxes run in the open fields',
  'the fox jumps high over the sleeping dog',
  'trees in the forest are tall and green and old',
].join('\n')

test('MarkovText constructs without throwing', () => {
  assert.doesNotThrow(() => new MarkovText(CORPUS))
})

test('MarkovText.generate returns string or null', () => {
  const m = new MarkovText(CORPUS)
  const result = m.generate()
  assert.ok(result === null || typeof result === 'string')
})

test('MarkovText.generate respects maxWords', () => {
  const m = new MarkovText(CORPUS)
  for (let i = 0; i < 10; i++) {
    const result = m.generate({ maxWords: 4 })
    if (result !== null) {
      assert.ok(result.split(' ').length <= 4, `Expected ≤4 words, got: "${result}"`)
    }
  }
})

test('MarkovText.generate respects minWords', () => {
  const m = new MarkovText(CORPUS)
  const result = m.generate({ minWords: 3, tries: 500 })
  if (result !== null) {
    assert.ok(result.split(' ').length >= 3)
  }
})

test('MarkovText.generate with custom tries', () => {
  const m = new MarkovText(CORPUS)
  const result = m.generate({ tries: 1 })
  assert.ok(result === null || typeof result === 'string')
})

test('MarkovText.generateWithStart returns prefixed result or null', () => {
  const m = new MarkovText(CORPUS)
  const result = m.generateWithStart('the', {})
  if (result !== null) {
    assert.ok(result.startsWith('the '), `Expected to start with "the ", got: "${result}"`)
  }
})

test('MarkovText.generateWithStart with unknown word returns null', () => {
  const m = new MarkovText(CORPUS)
  const result = m.generateWithStart('xyzunknownword', {})
  assert.strictEqual(result, null)
})

test('MarkovText.generate on empty corpus throws', () => {
  const m = new MarkovText('')
  assert.throws(() => m.generate())
})

test('MarkovVocab.toToken assigns sequential IDs', () => {
  const v = new MarkovVocab()
  const id0 = v.toToken('hello')
  const id1 = v.toToken('world')
  const id0Again = v.toToken('hello')
  assert.strictEqual(typeof id0, 'number')
  assert.strictEqual(id1, id0 + 1)
  assert.strictEqual(id0Again, id0)
})

test('MarkovVocab.toTokenOpt returns null for unknown word', () => {
  const v = new MarkovVocab()
  assert.strictEqual(v.toTokenOpt('notadded'), null)
})

test('MarkovVocab.toTokenOpt returns ID for known word', () => {
  const v = new MarkovVocab()
  const id = v.toToken('hello')
  assert.strictEqual(v.toTokenOpt('hello'), id)
})

test('MarkovVocab.toWord round-trips token to word', () => {
  const v = new MarkovVocab()
  const id = v.toToken('hello')
  assert.strictEqual(v.toWord(id), 'hello')
})

test('MarkovVocab.toWord returns empty string for unknown token', () => {
  const v = new MarkovVocab()
  assert.strictEqual(v.toWord(999), '')
})

test('StringChain.createEmpty and fromData are static factories', () => {
  assert.strictEqual(typeof StringChain.createEmpty, 'function')
  assert.strictEqual(typeof StringChain.fromData, 'function')
})

test('StringChain.fromData generates a non-empty sequence', () => {
  const data = [
    ['hello', 'world'],
    ['hello', 'there'],
    ['world', 'is', 'great'],
  ]
  const c = StringChain.fromData(data, '__begin__', '__end__')
  const result = c.generate()
  assert.ok(Array.isArray(result))
  assert.ok(result.length > 0)
})

test('StringChain.generate with init state', () => {
  const data = [['hello', 'world'], ['hello', 'there']]
  const c = StringChain.fromData(data, '__begin__', '__end__')
  const states = c.findInitStates('hello')
  if (states.length > 0) {
    const result = c.generate(states[0])
    assert.ok(Array.isArray(result))
  }
})

test('StringChain.findInitStates returns array of state arrays', () => {
  const data = [['hello', 'world'], ['hello', 'there']]
  const c = StringChain.fromData(data, '__begin__', '__end__')
  const states = c.findInitStates('hello')
  assert.ok(Array.isArray(states))
  assert.ok(states.length > 0)
  assert.ok(states.every(s => Array.isArray(s)))
})

test('StringChain.findInitStates returns empty for unknown token', () => {
  const data = [['hello', 'world']]
  const c = StringChain.fromData(data, '__begin__', '__end__')
  const states = c.findInitStates('unknown')
  assert.deepEqual(states, [])
})

test('StringChain.next throws for unknown state', () => {
  const data = [['hello', 'world']]
  const c = StringChain.fromData(data, '__begin__', '__end__')
  assert.throws(() => c.next(['nonexistent', 'state']))
})

test('StringChain.generate throws on empty chain', () => {
  const c = StringChain.createEmpty('__begin__', '__end__')
  assert.throws(() => c.generate())
})

test('MarkovText.generateAsync returns Promise resolving to string or null', async () => {
  const m = new MarkovText(CORPUS)
  const result = await m.generateAsync()
  assert.ok(result === null || typeof result === 'string')
})

test('MarkovText.generateAsync respects maxWords', async () => {
  const m = new MarkovText(CORPUS)
  const result = await m.generateAsync({ maxWords: 4 })
  if (result !== null) {
    assert.ok(result.split(' ').length <= 4)
  }
})

test('MarkovText.generateWithStartAsync returns Promise resolving to prefixed result or null', async () => {
  const m = new MarkovText(CORPUS)
  const result = await m.generateWithStartAsync('the', {})
  if (result !== null) {
    assert.ok(result.startsWith('the '))
  }
})

test('MarkovText.generateWithStartAsync with unknown word resolves to null', async () => {
  const m = new MarkovText(CORPUS)
  const result = await m.generateWithStartAsync('xyzunknown', {})
  assert.strictEqual(result, null)
})

test('MarkovText.generateWithStarts returns first successful result', () => {
  const m = new MarkovText(CORPUS)
  const result = m.generateWithStarts(['xyzunknown', 'the'], {})
  if (result !== null) {
    assert.ok(result.startsWith('the '))
  }
})

test('MarkovText.generateWithStarts all unknown returns null', () => {
  const m = new MarkovText(CORPUS)
  const result = m.generateWithStarts(['aaa', 'bbb', 'ccc'], {})
  assert.strictEqual(result, null)
})

test('MarkovText.generateMany returns an array of strings', () => {
  const m = new MarkovText(CORPUS)
  const results = m.generateMany(5)
  assert.ok(Array.isArray(results))
  assert.ok(results.every(r => typeof r === 'string'))
})

test('MarkovText.generateMany with count 0 returns empty array', () => {
  const m = new MarkovText(CORPUS)
  const results = m.generateMany(0)
  assert.deepEqual(results, [])
})

test('MarkovText.generateMany respects maxWords per item', () => {
  const m = new MarkovText(CORPUS)
  const results = m.generateMany(10, { maxWords: 4 })
  for (const r of results) {
    assert.ok(r.split(' ').length <= 4, `Expected ≤4 words, got: "${r}"`)
  }
})

test('MarkovText.generateManyAsync returns Promise<Array<string>>', async () => {
  const m = new MarkovText(CORPUS)
  const results = await m.generateManyAsync(5)
  assert.ok(Array.isArray(results))
  assert.ok(results.every(r => typeof r === 'string'))
})

test('MarkovText.generateManyAsync with count 0 resolves to empty array', async () => {
  const m = new MarkovText(CORPUS)
  const results = await m.generateManyAsync(0)
  assert.deepEqual(results, [])
})

test('MarkovText.generateAsync on empty corpus rejects', async () => {
  const m = new MarkovText('')
  await assert.rejects(() => m.generateAsync())
})

