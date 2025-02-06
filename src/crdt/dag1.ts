import {Field, Poseidon, Proof, Provable, SelfProof, Struct, ZkProgram} from 'o1js'
import {fieldToText, log, short, textToField} from '../utils/util.js'

/*
Like dag0, but each update also contains a depth and identifier of the group.
The depth of each update has to be the maximum depth of the predecessors plus 1.
The identifier of the group is the hash of the content of the initial update (all other fields of initial update are fixed).
The 'public input' is the update itself (content, predecessors).
The 'public output' is the hash of this update.
*/

const Hash = Field
type Hash = Field

export class Update extends Struct({
    content: Field,
    group_id: Hash,
    depth: Field,
    predecessors: [Hash, Hash]
}) {
    id(): Hash {
        return Poseidon.hash([this.content, this.group_id, this.depth, this.predecessors[0], this.predecessors[1]])
    }

    toString(): string {
        return `Update {text='${fieldToText(this.content)}', group_id=${short(this.group_id)}, depth=${this.depth}, predecessors=[${this.predecessors.map(short)}], id=${short(this.id())}}`
    }
}

export const Dag = ZkProgram({
    name: 'dag1',
    publicInput: Update,
    publicOutput: Hash,

    methods: {
        base: {
            privateInputs: [],
            async method(publicInput: Update) {
                publicInput.group_id.assertEquals(Poseidon.hash([publicInput.content]), 'group_id does not match hash')
                publicInput.depth.assertEquals(Field(0))
                Hash(0).assertEquals(publicInput.predecessors[0])
                Hash(0).assertEquals(publicInput.predecessors[1])
                return {publicOutput: publicInput.id()}
            }
        },

        step1: {
            privateInputs: [SelfProof<Update, Hash>],
            async method(publicInput: Update, p0: SelfProof<Update, Hash>) {
                p0.verify()
                p0.publicInput.group_id.assertEquals(publicInput.group_id, 'group_id\'s are not equal')
                p0.publicOutput.assertEquals(publicInput.predecessors[0])
                publicInput.depth.assertEquals(p0.publicInput.depth.add(1))
                Hash(0).assertEquals(publicInput.predecessors[1])
                return {publicOutput: publicInput.id()}
            }
        },

        step2: {
            privateInputs: [SelfProof<Update, Hash>, SelfProof<Update, Hash>],
            async method(publicInput: Update, p0: SelfProof<Update, Hash>, p1: SelfProof<Update, Hash>) {
                p0.verify()
                p0.publicInput.group_id.assertEquals(publicInput.group_id, 'group_id\'s are not equal')
                p0.publicOutput.assertEquals(publicInput.predecessors[0])
                p1.verify()
                p1.publicInput.group_id.assertEquals(publicInput.group_id, 'group_id\'s are not equal')
                p1.publicOutput.assertEquals(publicInput.predecessors[1])
                const max = Provable.if(p1.publicInput.depth.greaterThan(p0.publicInput.depth), p1.publicInput.depth, p0.publicInput.depth)
                publicInput.depth.assertEquals(max.add(1))
                return {publicOutput: publicInput.id()}
            }
        }
    }
})


export async function base(text: string, depth: Field = Field(0)) {
    const content: Field = textToField(text)
    const update = new Update({
        group_id: Poseidon.hash([content]),
        content: content,
        depth: depth,
        predecessors: [Hash(0), Hash(0)]
    })
    const {proof} = await Dag.base(update)
    log(' ' + update.toString())
    return proof
}

export async function step1(text: string, p0: Proof<Update, Hash>, depth: bigint = null) {
    const h = p0.publicInput.depth.add(Field(1))
    const update = new Update({
        group_id: p0.publicInput.group_id,
        content: textToField(text),
        depth: depth == null ? h : Field(depth),
        predecessors: [p0.publicOutput, Hash(0)]
    })
    const {proof} = await Dag.step1(update, p0)
    log(' ' + update.toString())
    return proof
}

export async function step2(text: string, p0: Proof<Update, Hash>, p1: Proof<Update, Hash>, depth: bigint = null) {
    const gt = p0.publicInput.depth.greaterThan(p1.publicInput.depth).toBoolean()
    const depth_ = (gt ? p0.publicInput.depth : p1.publicInput.depth).add(Field(1))
    const update = new Update({
        group_id: p0.publicInput.group_id,
        content: textToField(text),
        depth: depth == null ? depth_ : Field(depth),
        predecessors: [p0.publicOutput, p1.publicOutput]
    })
    const {proof} = await Dag.step2(update, p0, p1)
    log(' ' + update.toString())
    return proof
}