import {Field, Poseidon, SelfProof, Struct, verify, ZkProgram} from 'o1js'
import {log, section, start, stop} from '../../utils/util.js'


/*
```bash
npm run 'hash preimage:double'
```

This script demonstrates that it is possible to prove that a preimage exists with an arbitrarily long input without revealing the input using Poseidon.
However, it is only possible to append two field elements together, as otherwise the padding interferes.
An improved version of this can be found in `scripts/hash preimage/arbitrary.ts` (which uses `../utils/hash.ts`)
*/


class PoseidonStateDouble extends Struct({
    state: [Field, Field, Field]
}) {
    static from(state: [Field, Field, Field]): PoseidonStateDouble {
        return new PoseidonStateDouble({state: state})
    }

    getState(): [Field, Field, Field] {
        return this.state as [Field, Field, Field]
    }
}

const HashRecursionProgramDouble = ZkProgram({
    name: 'HashRecursionProgramDouble',
    publicOutput: PoseidonStateDouble,

    methods: {
        initialState: {
            privateInputs: [],
            async method() {
                return {publicOutput: PoseidonStateDouble.from(Poseidon.initialState())}
            }
        },

        update: {
            privateInputs: [SelfProof<void, PoseidonStateDouble>, Field, Field],
            async method(pred: SelfProof<void, PoseidonStateDouble>, f0: Field, f1: Field) {
                pred.verify()
                return {publicOutput: PoseidonStateDouble.from(Poseidon.update(pred.publicOutput.getState(), [f0, f1]))}
            }
        }
    }
})

export class ValidHashRecursionProgramDouble extends ZkProgram.Proof(HashRecursionProgramDouble) {
}

function getHashDouble(p: ValidHashRecursionProgramDouble) {
    return p.publicOutput.state[0]
}


start('data/hash preimage/double.txt')
section('compile HashRecursionProgramDouble')
const verificationKeyDouble = (await HashRecursionProgramDouble.compile()).verificationKey

section('create initialState proof')
const {proof: initialState} = await HashRecursionProgramDouble.initialState()

section('create first recursion proof')
const {proof: r1} = await HashRecursionProgramDouble.update(initialState, Field(23), Field(0))

section('verify')
log(` valid: ${await verify(r1, verificationKeyDouble)}`)

section('check that hashes match')
let actual_hash = getHashDouble(r1)
let expected_hash = Poseidon.hash([Field(23), Field(0)])
log(`\nactual_hash:   ${actual_hash}`)
log(`\nexpected_hash: ${expected_hash}\n`)
actual_hash.assertEquals(expected_hash)

section('create second recursion proof')
const {proof: r2} = await HashRecursionProgramDouble.update(r1, Field(1), Field(2))

section('create third recursion proof')
const {proof: r3} = await HashRecursionProgramDouble.update(r2, Field(3), Field(4))

section('verify')
log(` valid: ${await verify(r3, verificationKeyDouble)}`)

section('check that hashes match')
actual_hash = getHashDouble(r3)
expected_hash = Poseidon.hash([Field(23), Field(0), Field(1), Field(2), Field(3), Field(4)])
log(`\nactual_hash:   ${actual_hash}`)
log(`\nexpected_hash: ${expected_hash}\n`)
actual_hash.assertEquals(expected_hash)
stop()
