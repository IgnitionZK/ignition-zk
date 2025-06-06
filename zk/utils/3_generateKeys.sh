#!/bin/bash

echo "Generate keys for the ${CIRCUIT_PATH} circuit"
echo "------------------------------------------"
echo "Generating the zKey (proving and verification key) with PLONK..."
snarkjs plonk setup circuits/${CIRCUIT_PATH}/build/${CIRCUIT_FILENAME}.r1cs  \
                    universal-trusted-setup/pot${PTAU_POWER}_final.ptau \
                    circuits/${CIRCUIT_PATH}/build/${CIRCUIT_FILENAME}_final.zkey

echo "Exporting the verification key..."
snarkjs zkey export verificationkey circuits/${CIRCUIT_PATH}/build/${CIRCUIT_FILENAME}_final.zkey \
                                    circuits/${CIRCUIT_PATH}/build/${CIRCUIT_FILENAME}_key.json

echo "-----------------"
echo "- Step 3...Done -"
echo "-----------------"