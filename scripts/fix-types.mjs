import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../index.d.ts', import.meta.url).pathname.slice(1)
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
