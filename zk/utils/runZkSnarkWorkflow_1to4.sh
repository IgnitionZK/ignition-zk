#!/bin/bash

export CIRCUIT_FILENAME="membership_circuit"
export CIRCUIT_PATH="membership"
export CONTRACT_NAME="MembershipVerifier"
export PTAU_POWER=14

./utils/1_compileCircuit.sh

./utils/2_createTrustedSetup.sh

./utils/3_generateKeys.sh

./utils/4_exportVerifierContract.sh