import {Field, Poseidon, verify} from 'o1js'
import {log, section, start, stop, writeProof} from 'utils/util.js'
import {Dag, proveUpdate, Update, ValidDag} from 'crdt/dag2.js';
import {hash} from 'utils/hash.js'

/*
```bash
npm run 'dag2:test'
```
*/

async function test(update: Update, proof: ValidDag) {
    log(` ${update}`)
    section('verify')
    proof.publicOutput.id().assertEquals(update.id())
    log(` valid: ${await verify(proof, verificationKey)}`)
}

start('data/dag2/output.txt')
section('idOfUpdate works as expected')
new Update(Field(0), Field(1), Field(2), []).id()
    .assertEquals(hash([Field(0)/*room_id*/, Field(1)/*content*/, Field(2)/*depth*/, Field(0)/*length*/]))
new Update(Field(0), Field(1), Field(2), [Field(3)]).id()
    .assertEquals(hash([Field(0)/*room_id*/, Field(1)/*content*/, Field(2)/*depth*/, Field(1)/*length*/, Field(3)]))
new Update(Field(0), Field(1), Field(2), [Field(3), Field(4)]).id()
    .assertEquals(hash([Field(0)/*room_id*/, Field(1)/*content*/, Field(2)/*depth*/, Field(2)/*length*/, Field(3), Field(4)]))

section('compile')
const {verificationKey} = await Dag.compile()

section('create first update')
const [update0, proof0] = await proveUpdate('first update', Field(0), [])
await test(update0, proof0)

section('create second update')
const [update1, proof1] = await proveUpdate('second update', Field(1), [proof0])
await test(update1, proof1)

section('create many concurrent updates')
const [update2A, proof2A] = await proveUpdate('update A', Field(2), [proof1])
log(`\n${update2A}`)
const [update2B, proof2B] = await proveUpdate('update B', Field(2), [proof1])
log(`\n${update2B}`)
const [update2C, proof2C] = await proveUpdate('update C', Field(2), [proof1])
log(`\n${update2C}\n`)

section('create combining update')
const [update3, proof3] = await proveUpdate('combining', Field(3), [proof2A, proof2B, proof2C])
await test(update3, proof3)

section('write proof to file')
await writeProof('data/dag2/proof3.json', proof3)

stop()