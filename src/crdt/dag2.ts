import {Bool, Field, Poseidon, SelfProof, Struct, verify, ZkProgram} from 'o1js'
import {fieldToText, short, textToField} from 'utils/util.js'
import {hash, HashState} from 'utils/hash.js'
import {promises as fs} from 'fs'

/*
Like dag1, but with arbitrarily many predecessors.
Utilising 'src/utils/hash.js'
*/

const Hash = Field
type Hash = Field

const verificationKey = (await fs.readFile('data/dag2/verificationKey.tyt')).toString()

export class Update {
    constructor(public group_id: Hash, public content: Field, public depth: Field, public predecessors: Hash[]) {
    }

    static fromJSON(json: any): Update {
        return new Update(Hash(json.group_id), Field(json.content), Field(json.depth), json.predecessors.map(e => Hash(e)))
    }

    id(): Hash {
        return hash([this.group_id, this.content, this.depth, Field(this.predecessors.length)].concat(this.predecessors))
    }

    toString(): string {
        return `Update {text='${fieldToText(this.content)}', group_id=${short(this.group_id)}, depth=${this.depth}, predecessors=[${this.predecessors.map(short)}], id=${short(this.id())}}`
    }
}

class DagInnerState extends Struct({
    hash_state: HashState,
    group_id: Hash,
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
            async method(group_id: Hash, content: Field, depth: Field, predecessors_length: Field) {
                // if there are no predecessors (i.e. update is root), then the depth has to be 0 and root has to be the hash of the variable inputs (only content in this version)
                // (predecessors_length==0) ⇒ (depth==0 ∧ group_id==H(content))
                // ¬(predecessors_length==0) ∨ (depth==0 ∧ group_id==H(content))
                predecessors_length.equals(Field(0)).not().or(depth.equals(Field(0)).and(group_id.equals(Poseidon.hash([content])))).assertTrue()

                const hash_state: HashState = HashState.initialState().update(group_id).update(content).update(depth).update(predecessors_length)

                return {
                    publicOutput: new DagInnerState({
                        hash_state: hash_state,
                        group_id: group_id,
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
                self.publicOutput.group_id.assertEquals(pred.publicOutput.group_id, 'the update does not have the same group id')
                self.publicOutput.remaining_predecessors.assertNotEquals(Field(0), 'there are more predecessors than stated')
                return {
                    publicOutput: new DagInnerState({
                        hash_state: self.publicOutput.hash_state.update(pred.publicOutput.id()),
                        group_id: self.publicOutput.group_id,
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

export class ValidUpdate {
    constructor(public update: Update, public proof: ValidDag) {
    }

    async verify() {
        const valid = await verify(this.proof, verificationKey)
        return this.update.id().equals(this.proof.publicOutput.id()) && valid
    }

    static async fromJSON(json: any): Promise<ValidUpdate> {
        return new ValidUpdate(Update.fromJSON(json.update), await ValidDag.fromJSON(json.proof))
    }
}

export function getDepth(predecessors: ValidDag[]): Field {
    let max = -1n
    for (const e of predecessors) {
        if (e.publicOutput.depth.toBigInt() > max) {
            max = e.publicOutput.depth.toBigInt()
        }
    }
    return Field(max + 1n)
}

export async function proveUpdate(text: string, depth: Field, predecessors: ValidDag[]): Promise<ValidUpdate> {
    const content: Field = textToField(text)
    const group_id = predecessors.length == 0 ? Poseidon.hash([content]) : predecessors[0].publicOutput.group_id
    let {proof: state} = await Dag.base(group_id, content, depth, Field(predecessors.length))
    for (let i = 0; i < predecessors.length; i++) {
        state = (await Dag.next(state, predecessors[i])).proof
    }
    const update = new Update(group_id, content, depth, predecessors.map((e) => e.publicOutput.id()))
    return new ValidUpdate(update, state)
}