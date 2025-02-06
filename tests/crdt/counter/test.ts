import {PrivateKey, PublicKey, verify} from 'o1js'
import {analyzeMethods, log, section, start, stop} from 'utils/util.js'
import Counter from 'crdt/counter.js'
import {strict as assert} from 'assert'

/*
```bash
npm run 'counter:test'
```
*/

const privateKeys: PrivateKey[] = Array.from({length: 5}, () => PrivateKey.random())
const publicKeys: PublicKey[] = privateKeys.map(e => e.toPublicKey())
const C = Counter(publicKeys)

start('data/counter/output.txt')
section('compile')
const {verificationKey} = await C.ZkProgram.compile()

section('size of circuit')
analyzeMethods(await C.ZkProgram.analyzeMethods())

section('initial')
const initial = await C.initial()
log(` ${initial.publicOutput.debug()}`)
assert.equal(0n, initial.publicOutput.value().toBigInt())

section('inc1')
const inc1 = await C.increment(initial, privateKeys[0])
log(` ${inc1.publicOutput.debug()}`)
assert.equal(1n, inc1.publicOutput.value().toBigInt())

section('inc2')
const inc2 = await C.increment(initial, privateKeys[1])
log(` ${inc2.publicOutput.debug()}`)
assert.equal(1n, inc2.publicOutput.value().toBigInt())

section('merge')
const merge = await C.merge(inc1, inc2)
log(` ${merge.publicOutput.debug()}`)
assert.equal(2n, merge.publicOutput.value().toBigInt())

section('verify')
log(` valid: ${await verify(merge, verificationKey)}`)

stop()