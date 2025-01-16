import {PrivateKey, Proof, Provable, PublicKey, SelfProof, Signature, Struct, UInt64, ZkProgram} from 'o1js'

/*
A proof-carrying G-Counter with some artificial constraints
*/

export default function Counter(publicKeys: PublicKey[]) {
    const processes = publicKeys.length

    class FieldN extends Struct({
        array: Provable.Array(UInt64, processes)
    }) {
        provable_sum(): UInt64 {
            let sum = UInt64.from(0)
            for (const e of this.array) {
                sum = sum.add(e)
            }
            return sum
        }

        unsafe_sum(): bigint {
            return this.array.map((e: UInt64) => e.toBigInt()).reduce((acc: bigint, val: bigint) => acc + val, 0n)
        }

        unsafe_debug(): string {
            return `${this.unsafe_sum()} (${this.array})`
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

            inc: {
                privateInputs: [SelfProof<void, FieldN>, FieldN, Signature],
                async method(old: SelfProof<void, FieldN>, new_: FieldN, sig: Signature) {
                    old.verify()
                    const sum: UInt64 = old.publicOutput.provable_sum()

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
         * increase the counter by 1 from process i
         * @param C
         * @param privateKeys
         * @param p
         * @param i The i-th replica. Starts from 1.
         */
        async inc(privateKeys: PrivateKey[], p: Proof<void, FieldN>, i: number): Promise<Proof<void, FieldN>> {
            const array = p.publicOutput.array.map((item, index) => index === i - 1 ? item.add(1) : item)
            const sig = Signature.create(privateKeys[i - 1], array.map(item => item.toFields()).flat())
            let {proof} = await program.inc(p, new FieldN({array}), sig)
            //log(` ${debug(proof)}`)
            return proof
        }
    }
}