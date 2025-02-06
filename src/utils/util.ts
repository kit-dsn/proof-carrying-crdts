import {Encoding, Field, setNumberOfWorkers} from 'o1js'
import {PathLike} from 'node:fs'
import {createWriteStream, promises as fs} from 'fs'
import {performance} from 'perf_hooks'
import {strict as assert} from 'assert'
import chalk from 'chalk'

export async function writeJSON(filePath: PathLike, json: any) {
    await fs.writeFile(filePath, JSON.stringify(json))
}

export async function readJSON(filePath: PathLike) {
    const data = await fs.readFile(filePath)
    return JSON.parse(data.toString())
}

export function setWorkers() {
    const envVar = process.env.NUM_WORKERS
    if (envVar !== undefined) {
        const parsedValue = Number(envVar)

        if (!isNaN(parsedValue)) {
            setNumberOfWorkers(parsedValue)
            log(`Using ${parsedValue} workers.\n`)
        } else {
            // Otherwise, print a warning
            console.warn('Warning: Environment variable NUM_WORKERS is not a valid number.')
        }
    }
}

let time: number = 0
let writableStream = null

export function start(filePath: string) {
    writableStream = createWriteStream(filePath)
    writableStream.on('error', (error) => {
        process.stdout.write(`An error occured while writing to the file. Error: ${error.message}`)
    })
    setWorkers()
}

export function log(text: string) {
    process.stdout.write(text)
    if (writableStream != null)
        writableStream.write(text)
}

export function section(text?: string) {
    const endTime = performance.now()
    if (time != 0) {
        const diff = (endTime - time) / 1000
        log(` [took ${diff.toFixed(3)}s]\n`)
    }
    time = endTime
    log(`${text}...`)
}

export function analyzeMethods(methods: {[s: string]: {gates: any[], rows: number};}) {
    log('\n')
    for (const [key, {gates, rows}] of Object.entries(methods)) {
        log(`${key}: ${rows}\n`)
        assert.equal(rows, gates.length, `rows=${rows} gates.length=${gates.length}`)
    }
}

export function stop() {
    const endTime = performance.now()
    if (time != 0) {
        const diff = (endTime - time) / 1000
        log(` [took ${diff.toFixed(3)}s]\n`)
    }
    writableStream.end()
}

export async function csv(filePath: string, processors: number[], func: () => Promise<any>) {
    function csvRow(a: string, b: string) {
        const text = `${a},${b}\n`
        process.stdout.write(text)
        stream.write(text)
    }

    const stream = createWriteStream(filePath)
    stream.on('error', (error) => {
        process.stdout.write(`An error occured while writing to the file. Error: ${error.message}`)
    })

    csvRow('workers', 'time')
    for (const workers of processors) {
        setNumberOfWorkers(workers)
        const startTime = performance.now()
        await func()
        const diff = (performance.now() - startTime) / 1000
        csvRow(workers.toString(), diff.toFixed(3))
    }

    stream.end()
    setNumberOfWorkers(undefined)
}

export async function measureTiming(iterations: number, file: string, func: () => Promise<any>) {
    for (let i = 0; i < iterations; i++) {
        log(`${i}\n`)
        const startTime = performance.now()
        await func()
        const diff = (performance.now() - startTime) / 1000
        await fs.appendFile(file, `${diff}\n`)
    }
}

export function textToField(text: string): Field {
    const fields = Encoding.stringToFields(text)
    assert(fields.length == 1, 'message too long')
    return fields[0]
}

export function fieldToText(field: Field): string {
    return Encoding.stringFromFields([field])
}

export function short(field: Field): string {
    const hex = field.toBigInt().toString(16)
    return chalk.hex('#' + hex.substring(0, 6))(hex.substring(0, 10))
}

export function parseIntOrDefault(arg, defaultValue: number): number {
    const parsed = parseInt(arg, 10)
    return isNaN(parsed) ? defaultValue : parsed
}