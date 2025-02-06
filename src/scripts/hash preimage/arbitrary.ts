import {Field, VerificationKey, verify} from 'o1js'
import {log, section, start, stop} from 'utils/util.js'
import {hash, HashRecursionProgram, HashState, prove_hash} from 'utils/hash.js'


/*
```bash
npm run 'hash preimage:arbitrary'
```

This script demonstrates that it is possible to prove that a preimage exists with an arbitrarily long input without revealing the input using Poseidon.
For each input character a new proof is created.
This uses `utils/hash.ts`.
This is an improved version of `scripts/hash preimage/double.ts`
*/

start('data/hash preimage/arbitrary.txt')
section('test update and initialState functions')
for (let n = 0; n <= 10; n++) {
    const array: Field[] = new Array(n).fill(null).map((_, i) => Field(i * i))
    let state: HashState = HashState.initialState()
    for (const val of array) {
        state = state.update(val)
    }

    const expected_hash: Field = hash(array)
    const actual_hash: Field = state.getHash()
    log(`\narray:         [${array.toString()}]`)
    log(`\nactual_hash:   ${actual_hash}`)
    log(`\nexpected_hash: ${expected_hash}\n`)
    actual_hash.assertEquals(actual_hash)
}

section('compile HashRecursionProgram')
const verificationKey: VerificationKey = (await HashRecursionProgram.compile()).verificationKey

section('create initialState proof')
const {proof: r0} = await HashRecursionProgram.initialState()
log(' ' + JSON.stringify(r0.publicOutput))

section('create first recursion proof')
const {proof: r1} = await HashRecursionProgram.update(r0, Field(1))
log(' ' + JSON.stringify(r1.publicOutput))

section('create second recursion proof')
const {proof: r2} = await HashRecursionProgram.update(r1, Field(2))
log(' ' + JSON.stringify(r2.publicOutput))

section('verify')
log(` valid: ${await verify(r2, verificationKey)}`)

section('check that hashes match')
const actual_hash = r2.publicOutput.getHash()
const expected_hash = hash([Field(1), Field(2)])
log(`\nactual_hash:   ${actual_hash}`)
log(`\nexpected_hash: ${expected_hash}\n`)
actual_hash.assertEquals(expected_hash)

section('check utility')
const utility_hash_prove = await prove_hash([Field(1), Field(2)])

section('verify')
log(` valid: ${await verify(r2, verificationKey)}`)

section('check that hashes match')
const utility_hash = utility_hash_prove.publicOutput.getHash()
log(`\nactual_hash:   ${actual_hash}`)
log(`\nutility_hash:  ${utility_hash}\n`)
actual_hash.assertEquals(utility_hash)
stop()