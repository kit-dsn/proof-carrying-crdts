import {Field, Poseidon, verify} from 'o1js'
import {analyzeMethods, log, section, start, stop} from 'utils/util.js'
import {strict as assert} from 'assert'
import {base, Dag, step1, step2, Update} from 'crdt/dag1.js';

/*
```bash
npm run 'dag1:test'
```
*/

start('data/dag1/test.txt')
section('compile')
const {verificationKey} = await Dag.compile()

section('size of circuit')
analyzeMethods(await Dag.analyzeMethods())

section(`create base proof`)
const p0 = await base('Hello World!')
p0.publicInput.depth.assertEquals(Field(0))

section('recursive proof 1')
const p1 = await step1('Lorem ipsum', p0)
p1.publicInput.depth.assertEquals(Field(1))

section('recursive proof 2a')
const p2a = await step1('dolor sit amet', p1)
p2a.publicInput.depth.assertEquals(Field(2))

section('recursive proof 2b')
const p2b = await step1('hä?', p1)
p2b.publicInput.depth.assertEquals(Field(2))

section('recursive proof 3')
const p3 = await step2('consectetur adipiscing elit', p2a, p2b)
p3.publicInput.depth.assertEquals(Field(3))

section('recursive proof 4')
const p4 = await step2('consectetur adipiscing elit', p2a, p3)
p4.publicInput.depth.assertEquals(Field(4))

section('verify')
log(` valid: ${await verify(p3, verificationKey)}`)

section('test that errors are thrown on invalid depth: step1')
await assert.rejects(step1('bla', p0, 0n))
await assert.rejects(step1('bla', p0, 2n))

section('test that errors are thrown on invalid depth: step2')
await assert.rejects(step2('bla', p2a, p2b, 2n))
await assert.rejects(step2('bla', p2a, p2b, 4n))
await assert.rejects(step2('bla', p1, p3, 3n))
await assert.rejects(step2('bla', p1, p3, 5n))

section('test that base requires the predecessors to be 0')
await Dag.base(new Update({
    group_id: Poseidon.hash([Field(0)]),
    content: Field(0),
    depth: Field(0),
    predecessors: [Field(0), Field(0)]
}))
await assert.rejects(Dag.base(new Update({
    group_id: Poseidon.hash([Field(0)]),
    content: Field(0),
    depth: Field(0),
    predecessors: [Field(1), Field(0)]
})))
await assert.rejects(Dag.base(new Update({
    group_id: Poseidon.hash([Field(0)]),
    content: Field(0),
    depth: Field(0),
    predecessors: [Field(0), Field(1)]
})))

section('test that step1 requires the second predecessor to be 0')
await Dag.step1(new Update({
    group_id: p0.publicInput.group_id,
    content: Field(0),
    depth: Field(1),
    predecessors: [p0.publicOutput, Field(0)]
}), p0)

await assert.rejects(Dag.step1(new Update({
    group_id: Poseidon.hash([Field(0)]),
    content: Field(0),
    depth: Field(1),
    predecessors: [p0.publicOutput, Field(1)]
}), p0))

section('test that step1 requires the first predecessor to be the hash of the predecessor')
await assert.rejects(Dag.step1(new Update({
    group_id: Poseidon.hash([Field(0)]),
    content: Field(0),
    depth: Field(1),
    predecessors: [Field(0), Field(0)]
}), p0))

section('test that step2 requires the predecessors to be the hash of the predecessors')
await Dag.step2(new Update({
    group_id: p0.publicInput.group_id,
    content: Field(0),
    depth: Field(2),
    predecessors: [p0.publicOutput, p1.publicOutput]
}), p0, p1)
await assert.rejects(Dag.step2(new Update({
    group_id: p0.publicInput.group_id,
    content: Field(0),
    depth: Field(2),
    predecessors: [Field(0), p1.publicOutput]
}), p0, p1))
await assert.rejects(Dag.step2(new Update({
    group_id: p0.publicInput.group_id,
    content: Field(0),
    depth: Field(2),
    predecessors: [p0.publicOutput, Field(0)]
}), p0, p1))


stop()