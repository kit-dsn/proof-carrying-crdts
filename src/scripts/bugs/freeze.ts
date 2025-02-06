import {Field, SelfProof, verify, ZkProgram} from 'o1js'
import {writeJSON} from '../../utils/util.js'

/*
```bash
npm run 'bugs:freeze'
```

Minimal working example showing how o1js freezes after ~67 or ~200 iterations.
This seems to be the case because the WASM-thread has a memory leak, is limited to 4GB (32 bit WASM) and runs out of memory.
see https://github.com/o1-labs/o1js/issues/1214
*/

const LinearRecursion = ZkProgram({
    name: 'freeze',
    publicOutput: Field,

    methods: {
        baseCase: {
            privateInputs: [],
            async method() {
                return {publicOutput: Field(0)}
            }
        },

        step: {
            privateInputs: [SelfProof],
            async method(earlierProof: SelfProof<void, Field>) {
                earlierProof.verify()
                return {publicOutput: earlierProof.publicOutput.add(2)}
            }
        }
    }
})


console.log('compile')
const {verificationKey} = await LinearRecursion.compile()

console.log('create proof')

let proof = (await LinearRecursion.baseCase()).proof

//export class LinearRecursionProof extends ZkProgram.Proof(LinearRecursion) {}
//let proof: Proof<void, Field> = await LinearRecursionProof.fromJSON(await readJSON('data/crash/60.json'))

console.log(` valid: ${await verify(proof, verificationKey)} value: ${proof.publicOutput}`)


for (let i = 0; i < 500; i++) {
    try {
        console.log(`Iteration: ${i}`)
        proof = (await LinearRecursion.step(proof)).proof
    } catch (err) {
        console.error(`Error at iteration ${i}:`, err)
        break
    }
    console.log(JSON.stringify(process.memoryUsage()))
    await writeJSON(`data/freeze/${i}.json`, proof.toJSON())
}

console.log(`${JSON.stringify(proof.toJSON())}`)