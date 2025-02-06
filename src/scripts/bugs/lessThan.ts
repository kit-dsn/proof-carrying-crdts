import {Field, Provable, ZkProgram} from 'o1js'

/*
```bash
npm run 'bugs:lessThan'
```

Apparently it is not possible to compare two numbers in
*/

const Example = ZkProgram({
    name: 'lessThan',

    methods: {
        example: {
            privateInputs: [Field, Field],
            async method(a: Field, b: Field) {
                Provable.witness(Field, () => {
                    console.log(a.lessThan(b).toBoolean())
                    return Field(0)
                }).assertEquals(Field(0))
            }
        },
    }
})

// example usage
console.log(Field(0).lessThan(Field(0)).toBoolean())

console.log('compile')
const {verificationKey} = await Example.compile()

console.log('calling example')
await Example.example(Field(0), Field(0))
console.log('exit')