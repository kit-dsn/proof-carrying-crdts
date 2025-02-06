import {Field, SelfProof, verify, ZkProgram} from 'o1js'
import {log, readJSON, section, start, stop, writeJSON} from 'utils/util.js'
import {strict as assert} from 'assert'

/*
```bash
npm run 'recursion:linear'
```

A simple program that contains a zero-knowledge program, compiles it, creates proofs, verifies and saves them.
The zk-program just contains an integer which is valid when it is either 0 or another valid integer plus 2 (so effectively any even integer).
Conceptually this is corecursion and not recursion.
*/

const LinearRecursion = ZkProgram({
    name: 'linear recursion',
    publicInput: Field,

    methods: {
        baseCase: {
            privateInputs: [],
            async method(publicInput: Field): Promise<void> {
                publicInput.assertEquals(Field(0))
            }
        },

        step: {
            privateInputs: [SelfProof],
            async method(publicInput: Field, earlierProof: SelfProof<Field, void>): Promise<void> {
                earlierProof.verify()
                earlierProof.publicInput.add(2).assertEquals(publicInput)
            }
        }
    }
})

start('data/linear recursion/output.txt')
section('compile')
const {verificationKey} = await LinearRecursion.compile()

section('create proof')
const {proof} = await LinearRecursion.baseCase(Field(0))

section('verify proof')
log(` valid: ${await verify(proof, verificationKey)} value: ${proof.publicInput}`)

section('save proof to file')
const file = 'data/linear recursion/proof 0.json'
const file_recursive = 'data/linear recursion/proof 1.json'
await writeJSON(file, proof.toJSON())
log(' length: ' + JSON.stringify(proof.toJSON()).length)

section('read the proof again')
const proof_ = await readJSON(file)

section('verify proof')
log(` valid: ${await verify(proof_, verificationKey)} value: ${proof_.publicInput}`)

section('create recursive proof')
const {proof: recursive_proof} = await LinearRecursion.step(Field(2), proof)

section('verify proof')
log(` valid: ${await verify(recursive_proof, verificationKey)} value: ${recursive_proof.publicInput}`)
await writeJSON(file_recursive, recursive_proof.toJSON())

section('test that 1, 2 and -1 are not a valid baseCase')
await assert.rejects(LinearRecursion.baseCase(Field(1)))
await assert.rejects(LinearRecursion.baseCase(Field(2)))
await assert.rejects(LinearRecursion.baseCase(Field(-1)))

section('test that 0, 1 and 3 are not a valid step with the predecessor 1')
await assert.rejects(LinearRecursion.step(Field(0), proof))
await assert.rejects(LinearRecursion.step(Field(1), proof))
await assert.rejects(LinearRecursion.step(Field(3), proof))

stop()