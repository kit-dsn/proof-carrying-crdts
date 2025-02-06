import {Field} from 'o1js'
import {log, start, stop, writeJSON} from 'utils/util.js'
import {Dag, proveUpdate, ValidUpdate} from 'crdt/dag2.js'

/*
Prints the sizes of the proofs
JSON: size of the JSON representation which contains the actual proof in base64, but also the public input&output
raw: just the size of the proof itself as a binary (in bytes)

```bash
npm run 'dag2:size'
```
*/

async function debug(i: number, proof: ValidUpdate) {
    await writeJSON(`data/dag2/size/${i}.json`, proof)
    log(`${i}: JSON: ${JSON.stringify(proof).length} raw:${Buffer.from(proof.proof.toJSON().proof, 'base64').length}\n`)
}

start('data/dag2/size/output.txt')

const {verificationKey} = await Dag.compile()
const initial = await proveUpdate('first update', Field(0), [])

await debug(0, initial)

for (let i = 1; i <= 5; i++) {
    const valid_update = await proveUpdate('second update', Field(1), [initial.proof, initial.proof])
    await debug(i, valid_update)
}

stop()