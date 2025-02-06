import {Bool, Field, Poseidon, Proof, Provable, SelfProof, Struct, ZkProgram} from 'o1js'

/**
 * A wrapper for the o1js Poseidon implementation, which
 * - has reasonable padding for variable length inputs (similar to the original Poseidon proposal for variable input length hashing https://eprint.iacr.org/2019/458 Section 4.2).
 * - allows proving the hash value of variable length inputs using recursion
 * - buffering: input chunks can be individual fields (do not need to be a full block)
 *
 * Calling update multiple times on initialState should always return the same result as calling {@code hash} with the given inputs as an array.
 * Invariant: {@code hash(input) == getHash((await prove_hash(input)).publicOutput)}
 *
 * It can also be used in other zkPrograms similar to how it is used in {@link HashRecursionProgram}.
 * @see {@file src/crdt/dag2.ts}
 * @see {@file src/scripts/hash preimage/arbitrary.ts}
 */

// Poseidon but with reasonable padding similar to the original Poseidon proposal for variable input length hashing (https://eprint.iacr.org/2019/458 Section 4.2).
export function hash(input: Field[]) {
    return Poseidon.hash([...input, Field(1)])
}

// a HashState represents the state the Poseidon hash function is in from a given previous input
export class HashState extends Struct({
    state: [Field, Field, Field],
    // buffering of inputs
    hasNext: Bool,
    next: Field
}) {
    // the initial state of the Poseidon hash function
    static initialState(): HashState {
        return new HashState({
            state: Poseidon.initialState(),
            hasNext: Bool(false), next: Field(0)
        })
    }

    // update the state with one input element
    update(input: Field): HashState {
        // calculate the next state assuming pred.hasNext==false
        const stateA = {state: this.state, hasNext: Bool(true), next: input}

        // calculate the next state assuming pred.hasNext==true
        const hash_state = Poseidon.update(this.state as [Field, Field, Field], [this.next, input])
        const stateB = {state: hash_state, hasNext: Bool(false), next: Field(0)}

        // return the correct state of the upper two states
        return new HashState(Provable.if(this.hasNext, HashState, stateB, stateA))
    }

    /*
    get the final hash value of the given hash state
    adds a padding similar to the proposed padding for variable-input-length hashing in https://eprint.iacr.org/2019/458:
    "The padding consists of one field element being 1, and the remaining elements being 0."
    Note however, that the capacity value is not as proposed, but set to 2 by o1js ()
     */
    getHash(): Field {
        // calculate the hash assuming pred.hasNext==false
        const hashA = Poseidon.update(this.state as [Field, Field, Field], [Field(1), Field(0)])[0]

        // calculate the next state assuming pred.hasNext==true
        const hashB = Poseidon.update(this.state as [Field, Field, Field], [this.next, Field(1)])[0]

        // get the correct one of the states
        return Provable.if(this.hasNext, Field, hashB, hashA)
    }
}

/*
This can be used to demonstrate that it is possible to prove that a preimage exists with an arbitrarily long input without revealing the input using Poseidon.
 */
export const HashRecursionProgram = ZkProgram({
    name: 'HashRecursionProgram',
    publicOutput: HashState,

    methods: {
        initialState: {
            privateInputs: [],
            async method() {
                return {publicOutput: HashState.initialState()}
            }
        },

        update: {
            privateInputs: [SelfProof<void, HashState>, Field],
            async method(pred: SelfProof<void, HashState>, input: Field) {
                pred.verify()
                return {publicOutput: pred.publicOutput.update(input)}
            }
        }
    }
})

export async function prove_hash(input: Field[]): Promise<Proof<void, HashState>> {
    let state: Proof<void, HashState> = (await HashRecursionProgram.initialState()).proof
    for (const val of input) {
        state = (await HashRecursionProgram.update(state, val)).proof
    }
    return state
}