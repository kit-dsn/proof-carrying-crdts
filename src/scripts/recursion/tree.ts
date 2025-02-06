import {Field, Proof, SelfProof, verify, ZkProgram} from 'o1js'
import {log, section, start, stop, writeJSON} from 'utils/util.js'
import {strict as assert} from 'assert'

/*
```bash
npm run 'recursion:tree'
```

A simple program that contains a zero-knowledge program, compiles it, helper methods to create proofs, creates some proofs, saves the last one and verifies it.
The zk-program just contains an integer which can either be 5, 7 11 or the product of two other valid integer numbers.
Therefor 48125 is valid, as 48125 = 625*77, 77 = 11*7, 625 = 25*25, 25 = 5*5.
This is an example of tree co-recursion.
*/

const TreeRecursion = ZkProgram({
    name: 'tree recursion',
    publicInput: Field,

    methods: {
        baseCase: {
            privateInputs: [],
            async method(publicInput: Field) {
                publicInput.equals(Field(5)).or(publicInput.equals(Field(7)))
                    .or(publicInput.equals(Field(11))).assertTrue()
            }
        },

        step: {
            privateInputs: [SelfProof, SelfProof],
            async method(publicInput: Field, p1: SelfProof<Field, void>, p2: SelfProof<Field, void>) {
                p1.verify()
                p2.verify()
                publicInput.assertEquals(p1.publicInput.mul(p2.publicInput))
            }
        }
    }
})

function base(i: number) {
    section(`create proof constant ${i}`)
    return TreeRecursion.baseCase(Field(i))
}

function mult(a: Proof<Field, void>, b: Proof<Field, void>) {
    const mul = a.publicInput.toBigInt() * b.publicInput.toBigInt()
    section(`create proof ${a.publicInput} * ${b.publicInput} = ${mul}`)
    return TreeRecursion.step(Field(mul), a, b)
}

start('data/tree recursion/output.txt')
section('compile')
const {verificationKey} = await TreeRecursion.compile()

const {proof: p5} = await base(5)
const {proof: p7} = await base(7)
const {proof: p11} = await base(11)
const {proof: p25} = await mult(p5, p5)
const {proof: p625} = await mult(p25, p25)
const {proof: p77} = await mult(p7, p11)
const {proof: p48125} = await mult(p625, p77)

section('save proof to file')
const file = 'data/tree recursion/proof.json'
await writeJSON(file, p48125.toJSON())
log(` length: ${JSON.stringify(p48125.toJSON()).length}`)
section('verify')
log(` valid: ${await verify(p48125, verificationKey)} value: ${p48125.publicInput}`)

section('test that -1, 0, 1, 4, 6, 8, 12 are not a valid baseCase')
for (var i of [-1, 0, 1, 4, 6, 8, 12])
    await assert.rejects(TreeRecursion.baseCase(Field(i)))

section('test that -1, 0, 1, 24, 26 are not 5 multiplied with 5')
for (var i of [-1, 0, 1, 24, 26])
    await assert.rejects(TreeRecursion.step(Field(i), p5, p5))

stop()