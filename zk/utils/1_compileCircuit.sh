#!/bin/bash

echo "Compiling the MembershipProof circuit..."
circom circuits/${CIRCUIT_PATH}/${CIRCUIT_FILENAME}.circom --r1cs --wasm --sym -o circuits/${CIRCUIT_PATH}/build/

echo "-----------------"
echo "- Step 1...Done -"
echo "-----------------"