import {Field, Poseidon, Proof, Provable, SelfProof, Struct, ZkProgram} from 'o1js'
import {fieldToText, log, short, textToField} from '../utils/util.js'

/*
Similar to dag0.ts, but each update also contains a depth.
The depth of each update has to be larger than the depth of the predecessors
Calculation of identifier of updates and representing an update as a string are moved into the Update struct.
*/

const Hash = Field
type Hash = Field

export class Update extends Struct({
    room_id: Hash,
    content: Field,
    depth: Field,
    predecessors: [Hash, Hash]
}) {
    id(): Hash {
        return Poseidon.hash([this.content, this.depth, this.predecessors[0], this.predecessors[1]])
    }

    toString(): string {
        return `Update {room_id=${short(this.room_id)} text='${fieldToText(this.content)}', depth=${this.depth}, predecessors=[${this.predecessors.map(short)}], id=${short(this.id())}}`
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
                publicInput.room_id.assertEquals(Poseidon.hash([publicInput.content]), 'room_id does not match hash')
                Hash(0).assertEquals(publicInput.predecessors[0])
                Hash(0).assertEquals(publicInput.predecessors[1])
                return {publicOutput: publicInput.id()}
            }
        },

        step1: {
            privateInputs: [SelfProof<Update, Hash>],
            async method(publicInput: Update, p0: SelfProof<Update, Hash>) {
                p0.verify()
                p0.publicInput.room_id.assertEquals(publicInput.room_id, 'room_id\'s are not equal')
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
                p0.publicInput.room_id.assertEquals(publicInput.room_id, 'room_id\'s are not equal')
                p0.publicOutput.assertEquals(publicInput.predecessors[0])
                p1.verify()
                p1.publicInput.room_id.assertEquals(publicInput.room_id, 'room_id\'s are not equal')
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
        room_id: Poseidon.hash([content]),
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
        room_id: p0.publicInput.room_id,
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
        room_id: p0.publicInput.room_id,
        content: textToField(text),
        depth: depth == null ? depth_ : Field(depth),
        predecessors: [p0.publicOutput, p1.publicOutput]
    })
    const {proof} = await Dag.step2(update, p0, p1)
    log(' ' + update.toString())
    return proof
}