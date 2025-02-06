#!/bin/bash
# run all performance tests

# NUM_WORKERS=16

npm run dag2:performance 100 0 5

npm run dag2:performance2 100 compile
npm run dag2:performance2 100 verify
npm run dag2:performance2 100 base
npm run dag2:performance2 99 next

for i in compile verify base step1 step2; do npm run dag1:performance 100 $i; done