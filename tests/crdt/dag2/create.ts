import {readJSON, writeJSON} from 'utils/util.js'
import {Dag, getDepth, proveUpdate, ValidUpdate} from 'crdt/dag2.js'

/*
An example program for Dag2 that just creates a new proof from existing proofs

```bash
npm run 'dag2:create' [text] [path] [old...]
```
default text is 'Lorem Ipsum'
default path is 'data/dag2/create.json'


```bash
NUM_WORKERS=16 /usr/bin/time -v npm run dag2:create 'from_bash' 'data/dag2/create.json' 'data/dag2/size/1.json' 'data/dag2/size/3.json' &> data/dag2/create.txt
```
*/

const args = process.argv.slice(2)
const text = args[0] || 'Lorem Ipsum'
const path = args[1] || 'data/dag2/create.json'


let predecessors = []
for (const e of args.slice(2)) {
    const json = await readJSON(e)
    const valid_update = await ValidUpdate.fromJSON(json)
    predecessors = predecessors.concat(valid_update.proof)
}

// compiling is needed to create an update
const {verificationKey} = await Dag.compile()

// create the update
const update = await proveUpdate(text, getDepth(predecessors), predecessors)

console.log(update.update.toString())
await writeJSON(path, update)