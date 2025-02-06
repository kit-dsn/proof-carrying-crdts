import {PrivateKey, Proof, Provable, PublicKey, SelfProof, Signature, Struct, UInt64, ZkProgram} from 'o1js'

/*
A proof-carrying counter with an additional artificial constraint.
Each replica can only increment the counter by one,
if the current value is divisible by the identifier of the replica.
Each update is signed by a private key of the replica.
*/
export default function Counter(publicKeys: PublicKey[]) {
    // how many processes (i.e. replicas) there are
    const processes = publicKeys.length

    // A class which represents the array used within the counter.
    class FieldN extends Struct({
        array: Provable.Array(UInt64, processes)
    }) {
        // calculate the sum over the array in a provable manner
        value(): UInt64 {
            let sum = UInt64.from(0)
            for (const e of this.array) {
                sum = sum.add(e)
            }
            return sum
        }

        // returns a debug string with the sum and the individual entries of the array
        debug(): string {
            return `${this.value().toBigInt()} (${this.array})`
        }
    }

    const program = ZkProgram({
        name: 'counter-' + publicKeys.map(e => e.toBase58()).toString(),
        publicOutput: FieldN,

        methods: {
            initial: {
                privateInputs: [],
                async method() {
                    const array = new Array<UInt64>(processes)
                    for (let i = 0; i < processes; i++) {
                        array[i] = Provable.witness(UInt64, () => UInt64.from(0))
                        UInt64.from(0).assertEquals(array[i])
                    }
                    return {publicOutput: new FieldN({array})}
                }
            },

            increment: {
                privateInputs: [SelfProof<void, FieldN>, FieldN, Signature],
                async method(old: SelfProof<void, FieldN>, new_: FieldN, sig: Signature) {
                    old.verify()
                    const sum: UInt64 = old.publicOutput.value()

                    for (let i = 0; i < processes; i++) {
                        new_.array[i].equals(old.publicOutput.array[i]).or(
                            new_.array[i].equals(old.publicOutput.array[i].add(1))
                                .and(sig.verify(publicKeys[i], new_.array.map(item => item.toFields()).flat()))
                                .and(sum.mod(i + 1).equals(UInt64.zero))
                        ).assertTrue()
                    }
                    return {publicOutput: new_}
                }
            },

            merge: {
                privateInputs: [SelfProof<void, FieldN>, SelfProof<void, FieldN>],
                async method(m0: SelfProof<void, FieldN>, m1: SelfProof<void, FieldN>) {
                    m0.verify()
                    m1.verify()
                    const array = new Array<UInt64>(processes)
                    for (let i = 0; i < processes; i++) {
                        const f0: UInt64 = m0.publicOutput.array[i]
                        const f1: UInt64 = m1.publicOutput.array[i]
                        array[i] = Provable.witness(UInt64, () => f1.toBigInt() < f0.toBigInt() ? f0 : f1)
                        array[i].assertEquals(Provable.if(f1.lessThan(f0), f0, f1))
                    }
                    return {publicOutput: new FieldN({array})}
                }
            }
        }
    })

    return {
        get ZkProgram() {
            return program
        },

        get FieldN() {
            return FieldN
        },

        /**
         * increment the counter by 1 from the process with the given private key
         * @param old The old state with associated proof
         * @param privateKey The private key of the replica
         * @returns The new proof with associated state
         */
        async increment(old: Proof<void, FieldN>, privateKey: PrivateKey): Promise<Proof<void, FieldN>> {
            // the identifier of the replica that has this private key (starting with 1)
            const replica = publicKeys.findIndex(publicKey => publicKey.equals(privateKey.toPublicKey()).toBoolean()) + 1
            if (replica === 0)
                throw new Error('private key does not have a matching public key in this counter')
            // the array of the new state after incrementing
            const array = old.publicOutput.array.map((item, index) => index === replica - 1 ? item.add(1) : item)
            // the signature of the new state
            const sig = Signature.create(privateKey, array.map(item => item.toFields()).flat())
            // the proof for the new state
            let {proof} = await program.increment(old, new FieldN({array}), sig)
            return proof
        },

        /**
         * Create the initial proof of the counter
         * @returns The proof with associated state
         */
        async initial(): Promise<Proof<undefined, FieldN>> {
            return (await program.initial()).proof
        },

        /**
         * Merge two existing proofs with associated state into a new proof
         * @param m0 The first proof with associated state
         * @param m1 The second proof with associated state
         * @returns The new proof with associated state
         */
        async merge(m0: Proof<void, FieldN>, m1: Proof<void, FieldN>): Promise<Proof<void, FieldN>> {
            return (await program.merge(m0, m1)).proof
        }
    }
}