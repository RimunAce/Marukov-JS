import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const path = fileURLToPath(new URL('../index.d.ts', import.meta.url))
let src = readFileSync(path, 'utf8')

const replacements = [
  ['generateAsync(options?: TextOptions | undefined | null): Promise<unknown>', 'generateAsync(options?: TextOptions | undefined | null): Promise<string | null>'],
  ['generateWithStartAsync(start: string, options?: TextOptions | undefined | null): Promise<unknown>', 'generateWithStartAsync(start: string, options?: TextOptions | undefined | null): Promise<string | null>'],
  ['generateManyAsync(count: number, options?: TextOptions | undefined | null): Promise<unknown>', 'generateManyAsync(count: number, options?: TextOptions | undefined | null): Promise<Array<string>>'],
]

for (const [from, to] of replacements) {
  src = src.replaceAll(from, to)
}

writeFileSync(path, src, 'utf8')
