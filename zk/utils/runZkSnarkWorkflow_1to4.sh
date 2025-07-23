#!/bin/bash

export CIRCUIT_FILENAME="voting_circuit"
export CIRCUIT_PATH="voting"
export CONTRACT_NAME="VoteVerifier"
export PTAU_POWER=14
trusted_setup=false

./utils/1_compileCircuit.sh

if [ "$trusted_setup" = true ]; then
    echo "Running trusted setup..."
    ./utils/2_createTrustedSetup.sh
else
    echo "Skipping trusted setup..."
fi

./utils/3_generateKeys.sh

./utils/4_exportVerifierContract.sh

# copy necessary files to the public folder
echo "Copying necessary files to the public folder..."
./utils/copyToPublicFolder.sh
echo "Files copied successfully."