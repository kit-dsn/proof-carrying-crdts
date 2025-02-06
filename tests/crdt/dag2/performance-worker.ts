import {Field} from 'o1js'
import {log, parseIntOrDefault, section, start, stop} from 'utils/util.js'
import {Dag, proveUpdate, ValidDag, ValidUpdate} from 'crdt/dag2.js'
import {promises as fs} from 'fs'

/*
```bash
npm run 'dag2:performance-worker' [iterations] [number_of_predecessors] [worker_id]
```
*/

// Get arguments from command line
const args = process.argv.slice(2)

const iterations = parseIntOrDefault(args[0], 50)
const number_of_predecessors = parseIntOrDefault(args[1], 1)
const worker_id = parseIntOrDefault(args[2], 0)

const path = 'data/dag2/performance'
start(`${path}/worker/p${number_of_predecessors}_w${worker_id}.txt`)
log('npm run \'dag2:performance-worker\' [iterations] [number_of_predecessors] [worker_id]\n')
log(`Values: iterations=${iterations} number_of_predecessors=${number_of_predecessors} worker_id=${worker_id}\n`)

section('compile')
const {verificationKey} = await Dag.compile()

section('initial update')
const initial_update: ValidUpdate = await proveUpdate('initial update', Field(0), [])

section(`${number_of_predecessors} predecessors`)
const predecessors: ValidDag[] = Array(number_of_predecessors).fill(initial_update.proof)
for (let i = 0; i < iterations; i++) {
    log(`${i}\n`)
    const startTime = performance.now()
    await proveUpdate('lorem ipsum', Field(1), predecessors)
    const diff = (performance.now() - startTime) / 1000
    await fs.appendFile(`${path}/${number_of_predecessors}.txt`, `${diff}\n`)
}

stop()
