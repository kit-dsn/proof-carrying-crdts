import {Field} from 'o1js'
import {existsOne} from 'o1js/dist/web/lib/provable/core/exists.js'
import {Fp} from 'o1js/dist/web/bindings/crypto/finite-field.js'
import {assertMul} from 'o1js/dist/web/lib/provable/gadgets/basic.js'
import {FieldVar} from 'o1js/src/lib/provable/core/fieldvar.js'

/**
 * code samples used in presentation
 */

Field(3).mul(1)
function mul(x: Field, y: Field): Field {
    // create a new witness for z = x*y
    let z = existsOne(() => Fp.mul(x.toBigInt(), y.toBigInt()));

    // add a multiplication constraint
    assertMul(x, y, z);
    return z;
}


Field(3).inv()
function inv(x: Field): Field {
    // create a witness for z = x^(-1)
    let z = existsOne(() => Fp.inverse(x.toBigInt()) ?? 0n);

    // constrain x * z === 1
    assertMul(x, z, FieldVar[1]);
    return z;
}
