import {Field, Poseidon, verify, Void, ZkProgram} from 'o1js'
import {log, readJSON, section, start, stop, writeJSON} from '../../utils/util.js'
import {promises as fs} from 'fs'

/*
```bash
npm run 'hash preimage:constant'
```

A simple program that contains a zero-knowledge program, compiles it, creates proofs and verifies them.
The zk-program takes a private array of fixed length (2 Field elements) and guarantees that it has a given public hash value.
*/

const HashConstant = ZkProgram({
    name: 'hash preimage constant',
    publicInput: Field,
    publicOutput: Void,

    methods: {
        example: {
            privateInputs: [Field, Field],
            async method(publicInput: Field, privateInput0: Field, privateInput1: Field): Promise<void> {
                publicInput.assertEquals(Poseidon.hash([privateInput0, privateInput1]))
            }
        }
    }
})

const fileProof = 'data/hash preimage/constant/proof.json'
const fileVerificationKey = 'data/hash preimage/constant/verificationKey.txt'

const input = [Field(0), Field(0)]
const output = Poseidon.hash(input)

start('data/hash preimage/constant/output.txt')

{
    section('compile')
    const {verificationKey} = await HashConstant.compile()

    section('create proof')
    const {proof} = await HashConstant.example(output, Field(0), Field(0))

    section('verify proof')
    log(` valid: ${await verify(proof, verificationKey)} value: ${proof.publicInput}`)

    section('save proof to file')
    await writeJSON(fileProof, proof.toJSON())
    log(' length: ' + JSON.stringify(proof.toJSON()).length)

    section('save verificationKey to file')
    await fs.writeFile(fileVerificationKey, verificationKey.data)
}

{
    section('read the proof from file')
    const proof = await readJSON(fileProof)

    section('read verificationKey from file')
    const verificationKey = (await fs.readFile(fileVerificationKey)).toString()

    section('verify proof')
    log(` valid: ${await verify(proof, verificationKey)} value: ${proof.publicInput}`)
}

stop()