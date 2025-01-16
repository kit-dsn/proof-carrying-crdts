import {Bool, Field, Poseidon, SelfProof, Struct, ZkProgram} from 'o1js'
import {fieldToText, short, textToField} from 'utils/util.js'
import {hash, HashState} from 'utils/hash.js'

/*
Similar to dag1.ts, but with arbitrarily many predecessors.
Utilising "../utils/hash.js"
*/

const Hash = Field
type Hash = Field

export class Update {
    constructor(public room_id: Hash, public content: Field, public depth: Field, public predecessors: Hash[]) {
    }

    id(): Hash {
        return hash([this.room_id, this.content, this.depth, Field(this.predecessors.length)].concat(this.predecessors))
    }

    toString(): string {
        return `Update {room_id=${short(this.room_id)} text='${fieldToText(this.content)}', depth=${this.depth}, predecessors=[${this.predecessors.map(short)}], id=${short(this.id())}}`
    }
}

class DagInnerState extends Struct({
    hash_state: HashState,
    room_id: Hash,
    depth: Field,
    found_depth: Bool,
    remaining_predecessors: Field
}) {
    id(): Hash {
        this.remaining_predecessors.assertEquals(Field(0), 'there are less predecessors than stated')
        this.found_depth.assertTrue('the update depth was higher than the maximum depth + 1')
        return this.hash_state.getHash()
    }
}

export const Dag = ZkProgram({
    name: 'dag2',
    publicOutput: DagInnerState,

    methods: {
        base: {
            privateInputs: [Hash, Field, Field, Field],
            async method(room_id: Hash, content: Field, depth: Field, predecessors_length: Field) {
                // if there are no predecessors (i.e. update is root), then root has to be the hash of the variable inputs (only content in this version)
                // (predecessors_length==0) ⇒ (room_id==H(content))
                // ¬(predecessors_length==0) ∨ (room_id==H(content))
                predecessors_length.equals(Field(0)).not().or(room_id.equals(Poseidon.hash([content]))).assertTrue()

                const hash_state: HashState = HashState.initialState().update(room_id).update(content).update(depth).update(predecessors_length)

                return {
                    publicOutput: new DagInnerState({
                        hash_state: hash_state,
                        room_id: room_id,
                        depth: depth,
                        found_depth: predecessors_length.equals(Field(0)),
                        remaining_predecessors: predecessors_length
                    })
                }
            }
        },

        next: {
            privateInputs: [SelfProof<void, DagInnerState>, SelfProof<void, DagInnerState>],
            async method(self: SelfProof<void, DagInnerState>, pred: SelfProof<void, DagInnerState>) {
                self.verify()
                pred.verify()
                self.publicOutput.depth.assertGreaterThan(pred.publicOutput.depth, 'depth of update has to be greater the depths of the predecessors')
                self.publicOutput.room_id.assertEquals(pred.publicOutput.room_id, 'the update does not have the same room id')
                self.publicOutput.remaining_predecessors.assertNotEquals(Field(0), 'there are more predecessors than stated')
                return {
                    publicOutput: new DagInnerState({
                        hash_state: self.publicOutput.hash_state.update(pred.publicOutput.id()),
                        room_id: self.publicOutput.room_id,
                        depth: self.publicOutput.depth,
                        found_depth: self.publicOutput.found_depth.or(self.publicOutput.depth.equals(pred.publicOutput.depth.add(Field(1)))),
                        remaining_predecessors: self.publicOutput.remaining_predecessors.sub(Field(1))
                    })
                }
            }
        }
    }
})

export class ValidDag extends ZkProgram.Proof(Dag) {
}

export async function proveUpdate(text: string, depth: Field, predecessors: ValidDag[]): Promise<[Update, ValidDag]> {
    const content: Field = textToField(text)
    const room_id = predecessors.length == 0 ? Poseidon.hash([content]) : predecessors[0].publicOutput.room_id
    let {proof: state} = await Dag.base(room_id, content, depth, Field(predecessors.length))
    for (let i = 0; i < predecessors.length; i++) {
        state = (await Dag.next(state, predecessors[i])).proof
    }
    const update = new Update(room_id, content, depth, predecessors.map((e) => e.publicOutput.id()))
    return [update, state]
}