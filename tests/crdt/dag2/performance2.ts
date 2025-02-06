import {log, measureTiming, parseIntOrDefault, start, textToField} from 'utils/util.js'
import {Dag, proveUpdate} from 'crdt/dag2.js'
import {Field, Poseidon} from 'o1js'

/*
```bash
npm run 'dag2:performance2'
```
*/

const args = process.argv.slice(2)

const iterations = parseIntOrDefault(args[0], 50)
const action = args[1]

const path = 'data/dag2/performance'
start(`${path}/worker/${action}.txt`)
log('npm run \'dag2:performance2\' [iterations] [action]\n')
log(`Values: iterations=${iterations} action=${action}\n`)

log(`starting...\n`)
if (action === 'compile') {
    await measureTiming(iterations, `${path}/compile.txt`, () => Dag.compile())
} else {
    await Dag.compile()
    const content = textToField('Lorem Ipsum')
    if (action === 'base') {
        await measureTiming(iterations, `${path}/base.txt`, () => Dag.base(Poseidon.hash([content]), content, Field(0), Field(0)))
    } else if (action === 'next') {
        const initial_update = await proveUpdate('first update', Field(0), [])
        const base = (await Dag.base(initial_update.update.group_id, content, Field(1), Field(1))).proof
        await measureTiming(iterations, `${path}/next.txt`, () => Dag.next(base, initial_update.proof))
    } else if (action === 'verify') {
        const initial_update = await proveUpdate('first update', Field(0), [])
        await measureTiming(iterations, `${path}/verify.txt`, () => initial_update.verify())
    }
}
