# Proof-Carrying CRDTs Allow Succinct Non-Interactive Byzantine Update Validation

This repository contains the source code for the Proof-Carrying CRDTs that we present in [our paper](https://doi.org/XXXXXXX.XXXXXXX).

## Relevant Files

| File                 | Description                                                                                         |
|----------------------|-----------------------------------------------------------------------------------------------------|
| /src/crdt/counter.ts | A proof-carrying counter with an additional artificial constraint. (Chapter 3)                      |
| /src/crdt/dag0.ts    | A very simple proof-carrying HashDAG, with a maximum of 2 predecessors.                             |
| /src/crdt/dag1.ts    | Like dag0, but each update also contains a depth and identifier of the group. (Chapter 4)           |
| /src/crdt/dag2.ts    | Like dag1, but with arbitrarily many predecessors. Utilising 'src/utils/hash.js'. (Chapter 4)       |
| /src/utils/hash.ts   | Wrapper for Poseidon which allows proving the hash value of variable length inputs using recursion. |


## Install
```bash
npm install
```

## Execute
To see a list of possible examples execute

```bash
npm run
```

To execute the first of the examples you can run

```bash
npm run 'recursion:linear'
```

or alternatively

```bash
npm exec tsx 'src/scripts/recursion/linear.ts'
```

## Number of Workers
To change how many workers are used, set the environment variable `NUM_WORKERS` to the desired number.

```bash
NUM_WORKERS=8 npm run 'recursion:linear'
```

To test what is a good amount of workers, execute `npm run 'counter:numberOfWorkers'` and take a look at the files written to `data/counter`

## Clear Cache
```bash
rm ~/.cache/o1js/*
```

## Links
- https://github.com/o1-labs/o1js
- https://docs.minaprotocol.com/zkapps/o1js
- https://o1-labs.github.io/proof-systems/introduction.html