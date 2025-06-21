#!/bin/bash

echo "Exporting the verifier contract for the ${CIRCUIT_PATH} circuit"
echo "------------------------------------------------------------"
snarkjs zkey export solidityverifier circuits/${CIRCUIT_PATH}/build/${CIRCUIT_FILENAME}_final.zkey \
                                     ../hardhat/contracts/${CONTRACT_NAME}.sol

echo "Renaming the contract from PlonkVerifier to ${CONTRACT_NAME}..."
sed -i "s/contract PlonkVerifier/contract ${CONTRACT_NAME}/" ../hardhat/contracts/verifiers/${CONTRACT_NAME}.sol

echo "-----------------"
echo "- Step 4...Done -"
echo "-----------------"