# Proof-Carrying CRDTs Allow Succinct Non-Interactive Byzantine Update Validation

This repository contains the source code for the Proof-Carrying CRDTs that we present in [our paper](https://doi.org/XXXXXXX.XXXXXXX).

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