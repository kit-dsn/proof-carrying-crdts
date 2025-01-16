import {PrivateKey, PublicKey, verify} from 'o1js'
import {log, section, start, stop} from 'utils/util.js'
import Counter from 'crdt/counter.js';

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

section('initial')
const {proof: initial} = await C.ZkProgram.initial()
log(` ${initial.publicOutput.unsafe_debug()}`)

section('inc1')
const inc1 = await C.inc(privateKeys, initial, 1)
log(` ${inc1.publicOutput.unsafe_debug()}`)

section('inc2')
const inc2 = await C.inc(privateKeys, initial, 2)
log(` ${inc2.publicOutput.unsafe_debug()}`)

section('merge')
const {proof: merge} = await C.ZkProgram.merge(inc1, inc2)
log(` ${merge.publicOutput.unsafe_debug()}`)

section('verify')
log(` valid: ${await verify(merge, verificationKey)}`)

stop()