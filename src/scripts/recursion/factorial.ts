import {Field, SelfProof, verify, ZkProgram} from 'o1js'
import {log, section, start, stop} from 'utils/util.js'
import {strict as assert} from 'assert'

/*
```bash
npm run 'recursion:factorial'
```

A simple program that contains a zero-knowledge program, compiles it, creates proofs and verifies them.
The zk-program has the publicOutput as the publicInput-th factorial.
*/

// explicit iteration
function facL(n: bigint): bigint {
    let product: bigint = 1n
    for (let i = n; i > 0; i = i - 1n)
        product *= i
    return product
}

// recursive function
function facR(n: bigint): bigint {
    if (n == 0n)
        return 1n
    else
        return facR(n - 1n) * n
}

for (let i = 0n; i < 10n; i++) {
    assert(facL(i) == facR(i))
}

const LinearRecursion = ZkProgram({
    name: 'factorial recursion',
    publicInput: Field,
    publicOutput: Field,

    methods: {
        baseCase: {
            privateInputs: [],
            async method(i: Field) {
                i.assertEquals(Field(0))
                return {publicOutput: Field(1)}
            }
        },

        step: {
            privateInputs: [SelfProof],
            async method (i: Field, earlierProof: SelfProof<Field, Field>) {
                i.assertEquals(earlierProof.publicInput.add(Field(1)))
                earlierProof.verify()
                return {publicOutput: earlierProof.publicOutput.mul(i)}
            }
        }
    }
})

start('data/linear recursion/factorial.txt')
section('compile')
const {verificationKey} = await LinearRecursion.compile()

section('create base proof')
let {proof} = await LinearRecursion.baseCase(Field(0))

section('verify proof')
log(` valid: ${await verify(proof, verificationKey)} in: ${proof.publicInput} out: ${proof.publicOutput}`)

for (let i = 1n; i < 5n; i++) {
    section('create recursive proof')
    proof = (await LinearRecursion.step(Field(i), proof)).proof

    section('verify proof')
    log(` valid: ${await verify(proof, verificationKey)} in: ${proof.publicInput} out: ${proof.publicOutput}`)
    assert(facL(proof.publicInput.toBigInt()) == proof.publicOutput.toBigInt())
}
stop()