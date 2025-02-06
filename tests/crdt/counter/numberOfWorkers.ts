import {Cache, PrivateKey, PublicKey} from 'o1js'
import {csv} from 'utils/util.js'
import Counter from 'crdt/counter.js'
import {cpus} from 'node:os'

/*
```bash
npm run 'counter:numberOfWorkers'
```
*/

//const processors = [1, 2, 3, 6, 8, 12, 18, 24, 36, 48]
const processors = Array.from({length: cpus().length}, (_, i) => i + 1)

const privateKeys: PrivateKey[] = Array.from({length: 5}, () => PrivateKey.random())
const publicKeys: PublicKey[] = privateKeys.map(e => e.toPublicKey())
const C = Counter(publicKeys)

console.log('\n=== compile ===\n')
await csv('data/counter/compile.csv', processors, () => C.ZkProgram.compile({cache: Cache.None}))

console.log('\n=== initial ===\n')
await csv('data/counter/initial.csv', processors, () => C.initial())

console.log('\n=== inc ===\n')
const initial = await C.initial()
await csv('data/counter/inc.csv', processors, () => C.increment(initial, privateKeys[0]))

console.log('\n=== merge ===\n')
const inc1 = await C.increment(initial, privateKeys[0])
const inc3 = await C.increment(initial, privateKeys[2])
await csv('data/counter/merge.csv', processors, () => C.merge(inc1, inc3))

console.log('\n=== verify ===\n')
await csv('data/counter/verify.csv', processors, () => C.ZkProgram.verify(initial))