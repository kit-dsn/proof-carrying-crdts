import {log, start, stop} from 'utils/util.js'
import {spawnSync} from 'child_process';

/*
```bash
npm run 'dag2:performance'
```
*/

// Get arguments from command line
const args = process.argv.slice(2);

function parseIntOrDefault(arg: string, defaultValue: number): number {
    const parsed = parseInt(arg, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

const sample_size = parseIntOrDefault(args[0], 100);
const predecessors_min = parseIntOrDefault(args[1], 0);
const predecessors_max = parseIntOrDefault(args[2], 5);

start('data/dag2/performance/main.txt')
log('npm run \'dag2:performance\' [sample_size] [predecessors_min] [predecessors_max]\n')
log(`Values: sample_size=${sample_size} predecessors_min=${predecessors_min} predecessors_max=${predecessors_max}\n`)

const steps_per_worker_a = [50, 25, 15, 10, 10, 5]

for (let i = predecessors_min; i <= predecessors_max; i++) {
    const steps_per_worker = steps_per_worker_a[i] //Math.ceil(proofs_per_worker / (i + 1))
    log(`Predecessors: ${i}\n`)
    for (let j = 0; j < Math.ceil(sample_size / steps_per_worker); j++) {
        const args = ['run', 'dag2:performance-worker', steps_per_worker.toString(), i.toString(), j.toString()]
        log(`Execute: npm ${args.join(' ')}\n\n`)
        const ret = spawnSync('npm', args, {stdio: 'inherit', env: process.env});
        log(`Finished: pid=${ret.pid} signal=${ret.signal} status=${ret.status}\n`)
    }
}

stop()
