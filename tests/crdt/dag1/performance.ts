import {log, measureTiming, parseIntOrDefault, start} from 'utils/util.js'
import {base, Dag, step1, step2, Update} from 'crdt/dag1.js';
import {Field, Proof} from 'o1js'

/*
```bash
npm run 'dag1:performance'
```
*/

const args = process.argv.slice(2)

const iterations = parseIntOrDefault(args[0], 50)
const action = args[1]

const path = 'data/dag1'
start(`${path}/${action}_log.txt`)
log('npm run \'dag1:performance\' [iterations] [action]\n')
log(`Values: iterations=${iterations} action=${action}\n`)

await Dag.compile()
const p0: Proof<Update, Field> = await base('Hello World!')

log(`starting...\n`)
switch (action) {
    case 'compile': {
        await measureTiming(iterations, `${path}/compile.txt`, () => Dag.compile())
        break
    }
    case 'verify': {
        await measureTiming(iterations, `${path}/verify.txt`, () => Dag.verify(p0))
        break
    }
    case 'base': {
        await measureTiming(iterations, `${path}/base.txt`, () => base('Hello World!'))
        break
    }
    case 'step1': {
        await measureTiming(iterations, `${path}/step1.txt`, () => step1('Hello World!', p0))
        break
    }
    case 'step2': {
        await measureTiming(iterations, `${path}/step2.txt`, () => step2('Hello World!', p0, p0))
        break
    }
    default: {
        log(`Unable to find action`)
    }
}
