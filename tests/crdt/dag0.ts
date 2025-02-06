import {analyzeMethods, log, section, start, stop} from 'utils/util.js';
import {Field, verify} from "o1js";
import {strict as assert} from "assert";
import {base, Dag, step1, step2, Update, updateProofToString} from 'crdt/dag0.js';

/*
```bash
npm run 'dag0'
```
*/

start('data/dag0.txt')
section('compile')
const {verificationKey} = await Dag.compile()

section('size of circuit')
analyzeMethods(await Dag.analyzeMethods())

section(`create base proof`)
const p0 = await base('Hello World!')
log(` ${updateProofToString(p0)} p0.maxProofsVerified=${p0.maxProofsVerified}`)
section('verify')
log(` valid: ${await verify(p0, verificationKey)}`)

section('recursive proof 1')
const p1 = await step1('Lorem ipsum', p0)
log(` ${updateProofToString(p1)} p1.maxProofsVerified=${p1.maxProofsVerified}`)
section('verify')
log(` valid: ${await verify(p1, verificationKey)}`)

section('recursive proof 2')
const p2 = await step2('dolor sit amet', p1, p0)
log(` ${updateProofToString(p2)} p2.maxProofsVerified=${p2.maxProofsVerified}`)
section('verify')
log(` valid: ${await verify(p2, verificationKey)}`)

section('test that base requires the predecessors to be 0')
await Dag.base(new Update({content: Field(0), predecessors: [Field(0), Field(0)]}))
await assert.rejects(Dag.base(new Update({content: Field(0), predecessors: [Field(1), Field(0)]})))
await assert.rejects(Dag.base(new Update({content: Field(0), predecessors: [Field(0), Field(1)]})))

section('test that step1 requires the second predecessor to be 0')
await Dag.step1(new Update({content: Field(0), predecessors: [p0.publicOutput, Field(0)]}), p0)
await assert.rejects(Dag.step1(new Update({content: Field(0), predecessors: [p0.publicOutput, Field(1)]}), p0))

section('test that step1 requires the first predecessor to be the hash of the predecessor')
await assert.rejects(Dag.step1(new Update({content: Field(0), predecessors: [Field(0), Field(0)]}), p0))

section('test that step2 requires the predecessors to be the hash of the predecessors')
await Dag.step2(new Update({content: Field(0), predecessors: [p0.publicOutput, p1.publicOutput]}), p0, p1)
await assert.rejects(Dag.step2(new Update({content: Field(0), predecessors: [Field(0), p1.publicOutput]}), p0, p1))
await assert.rejects(Dag.step2(new Update({content: Field(0), predecessors: [p0.publicOutput, Field(0)]}), p0, p1))

stop()