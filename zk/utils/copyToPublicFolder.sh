#!/bin/bash

# Output directory
OUTPUT_DIR="../frontend/public/${CIRCUIT_FILENAME}"

# Create the output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Copy necessary files to the public folder
cp -f circuits/${CIRCUIT_PATH}/build/${CIRCUIT_FILENAME}_js/${CIRCUIT_FILENAME}.wasm \
      ../frontend/public/${CIRCUIT_FILENAME}

cp -f circuits/${CIRCUIT_PATH}/build/${CIRCUIT_FILENAME}_final.zkey \
      ../frontend/public/${CIRCUIT_FILENAME}

cp -f circuits/${CIRCUIT_PATH}/build/${CIRCUIT_FILENAME}_key.json \
      ../frontend/public/${CIRCUIT_FILENAME}