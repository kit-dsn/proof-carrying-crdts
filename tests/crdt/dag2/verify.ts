import {readJSON, setWorkers, short} from 'utils/util.js'
import {ValidUpdate} from '../../../src/crdt/dag2.js'

/*
An example program for Dag2 that just verifies whether a given proof is valid

```bash
npm run 'dag2:verify' [path]
```
default path is 'data/dag2/size/1.json'

```bash
NUM_WORKERS=16 /usr/bin/time -v npm run dag2:verify &> data/dag2/verify.txt
```
*/

setWorkers()

const args = process.argv.slice(2)
const path = args[0] || 'data/dag2/size/1.json' // Use the first argument or 'default_value' if it's undefined

const update = await ValidUpdate.fromJSON(await readJSON(path))
console.log(`update: ${update.update.toString()}`)
const valid: boolean = await update.verify()
console.log(`valid: ${valid}`)