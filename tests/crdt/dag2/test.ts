import {Field} from 'o1js'
import {analyzeMethods, log, section, start, stop, writeJSON} from 'utils/util.js'
import {Dag, proveUpdate, Update, ValidUpdate} from 'crdt/dag2.js'
import {hash} from 'utils/hash.js'
import {promises as fs} from 'fs'

/*
```bash
npm run 'dag2:test'
```
*/

async function test(valid_update: ValidUpdate) {
    log(` ${valid_update.update}`)
    section('verify')
    log(` valid: ${await valid_update.verify()}`)
}

start('data/dag2/test.txt')
section('idOfUpdate works as expected')
new Update(Field(0), Field(1), Field(2), []).id()
    .assertEquals(hash([Field(0)/*group_id*/, Field(1)/*content*/, Field(2)/*depth*/, Field(0)/*length*/]))
new Update(Field(0), Field(1), Field(2), [Field(3)]).id()
    .assertEquals(hash([Field(0)/*group_id*/, Field(1)/*content*/, Field(2)/*depth*/, Field(1)/*length*/, Field(3)]))
new Update(Field(0), Field(1), Field(2), [Field(3), Field(4)]).id()
    .assertEquals(hash([Field(0)/*group_id*/, Field(1)/*content*/, Field(2)/*depth*/, Field(2)/*length*/, Field(3), Field(4)]))

section('compile')
const {verificationKey} = await Dag.compile()
await fs.writeFile('data/dag2/verificationKey.tyt', verificationKey.data)

section('size of circuit')
analyzeMethods(await Dag.analyzeMethods())

section('create first update')
const update0 = await proveUpdate('first update', Field(0), [])
await test(update0)

section('create second update')
const update1 = await proveUpdate('second update', Field(1), [update0.proof])
await test(update1)

section('create many concurrent updates')
const update2A = await proveUpdate('update A', Field(2), [update1.proof])
log(`\n${update2A.update}`)
const update2B = await proveUpdate('update B', Field(2), [update1.proof])
log(`\n${update2B.update}`)
const update2C = await proveUpdate('update C', Field(2), [update1.proof])
log(`\n${update2C.update}\n`)

section('create combining update')
const update3 = await proveUpdate('combining', Field(3), [update2A.proof, update2B.proof, update2C.proof])
await test(update3)

stop()