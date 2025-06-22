#!/bin/bash

# Copy necessary files to the public folder
cp -f circuits/${CIRCUIT_PATH}/build/${CIRCUIT_FILENAME}_js/${CIRCUIT_FILENAME}.wasm \
      ../frontend/public/${CIRCUIT_FILENAME}

cp -f circuits/${CIRCUIT_PATH}/build/${CIRCUIT_FILENAME}_final.zkey \
      ../frontend/public/${CIRCUIT_FILENAME}

cp -f circuits/${CIRCUIT_PATH}/build/${CIRCUIT_FILENAME}_key.json \
      ../frontend/public/${CIRCUIT_FILENAME}