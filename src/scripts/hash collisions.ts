import {Field, Poseidon} from 'o1js'
import {log, start, stop} from '../utils/util.js'
import {strict as assert} from 'assert'

/*
```bash
npm run 'hash collisions'
```

Apparently there are hash collisions due to the padding?!
*/

start('data/hash collisions.txt')
const h23 = Poseidon.hash([Field(23)])
const h23_0 = Poseidon.hash([Field(23), Field(0)])
log(`H([23])      : ${h23}\n`)
log(`H([23, 0])   : ${h23_0}\n`)
h23.assertEquals(3271569204915786621100538914229507138636671634840322574650154932939519691627n)
h23.assertEquals(h23_0)

const he = Poseidon.hash([])
const h0 = Poseidon.hash([Field(0)])
const h0_0 = Poseidon.hash([Field(0), Field(0)])
const h0_0_0 = Poseidon.hash([Field(0), Field(0), Field(0)])
log(`H([])        : ${he}\n`)
log(`H([0])       : ${h0}\n`)
log(`H([0, 0])    : ${h0_0}\n`)
log(`H([0, 0, 0]) : ${h0_0_0}\n`)
he.assertEquals(21565680844461314807147611702860246336805372493508489110556896454939225549736n)
he.assertEquals(h0)
he.assertEquals(h0_0)
h0_0_0.assertEquals(15632594125205012933270775512041100774922902129630782398682867600973342943653n)
he.assertNotEquals(h0_0_0)

function toField(bi: number[]) {
    return bi.map((x) => Field(x))
}

// the rate of Poseidon is 2 (poseidonParamsKimchiFp.rate from "o1js/dist/node/bindings/crypto/constants.js")
const t = Poseidon.hash(toField([0, 1, 2, 3]))
Poseidon.update(Poseidon.initialState(), toField([0, 1, 2, 3]))[0].assertEquals(t)
Poseidon.update(Poseidon.update(Poseidon.initialState(), toField([0, 1])), toField([2, 3]))[0].assertEquals(t)
assert.throws(() => {
    Poseidon.update(Poseidon.update(Poseidon.initialState(), toField([0])), toField([1, 2, 3]))[0].assertEquals(t)
})
assert.throws(() => {
    Poseidon.update(Poseidon.update(Poseidon.initialState(), toField([0])), toField([1]))[0].assertEquals(Poseidon.hash(toField([0, 1])))
})
stop()