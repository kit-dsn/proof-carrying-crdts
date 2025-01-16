import {Field, Poseidon, Proof, SelfProof, Struct, ZkProgram} from 'o1js'
import {fieldToText, textToField} from '../utils/util.js'

/*
A program that contains a struct Update that contains a Field which contains a small text and the hashes of two predecessor elements.
This forms a HashDAG.
Also contains a zk-program that verifies whether a given Update is valid.
Valid means that the predecessors have to be either 0 (interpreted as null), or the hash of a valid update.
The 'public output' is this hash of an update.
The text is not checked in any way.
*/

const Hash = Field
type Hash = Field

const DUMMY_HASH = Hash(0)

export class Update extends Struct({
    content: Field,
    predecessors: [Hash, Hash]
}) {
    id(): Hash {
        return Poseidon.hash([this.content, this.predecessors[0], this.predecessors[1]])
    }
}

export function updateProofToString(update: Proof<Update, Hash>): string {
    if (update == null) {
        return null
    } else {
        return `Update {text='${fieldToText(update.publicInput.content)}', predecessors=[${update.publicInput.predecessors}], hash=${update.publicOutput}}`
    }
}

export const Dag = ZkProgram({
    name: 'dag0',
    publicInput: Update,
    publicOutput: Hash,

    methods: {
        base: {
            privateInputs: [],
            async method(publicInput: Update) {
                DUMMY_HASH.assertEquals(publicInput.predecessors[0])
                DUMMY_HASH.assertEquals(publicInput.predecessors[1])
                return {publicOutput: publicInput.id()}
            }
        },

        step1: {
            privateInputs: [SelfProof<Update, Hash>],
            async method(publicInput: Update, p0: SelfProof<Update, Hash>) {
                p0.verify()
                p0.publicOutput.assertEquals(publicInput.predecessors[0])
                DUMMY_HASH.assertEquals(publicInput.predecessors[1])
                return {publicOutput: publicInput.id()}
            }
        },

        step2: {
            privateInputs: [SelfProof<Update, Hash>, SelfProof<Update, Hash>],
            async method(publicInput: Update, p0: SelfProof<Update, Hash>, p1: SelfProof<Update, Hash>) {
                p0.verify()
                p0.publicOutput.assertEquals(publicInput.predecessors[0])
                p1.verify()
                p1.publicOutput.assertEquals(publicInput.predecessors[1])
                return {publicOutput: publicInput.id()}
            }
        }
    }
})


export async function base(text: string) {
    const update = new Update({content: textToField(text), predecessors: [DUMMY_HASH, DUMMY_HASH]})
    const {proof} = await Dag.base(update)
    return proof
}

export async function step1(text: string, p0: Proof<Update, Hash>) {
    const update = new Update({content: textToField(text), predecessors: [p0.publicOutput, DUMMY_HASH]})
    const {proof} = await Dag.step1(update, p0)
    return proof
}

export async function step2(text: string, p0: Proof<Update, Hash>, p1: Proof<Update, Hash>): Promise<Proof<Update, Hash>> {
    const update = new Update({content: textToField(text), predecessors: [p0.publicOutput, p1.publicOutput]})
    const {proof} = await Dag.step2(update, p0, p1)
    return proof
}