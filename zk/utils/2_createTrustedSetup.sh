#!/bin/bash

echo "Phase 1 of universal trusted setup..."
echo "Creating the universal Structured Reference String..."
snarkjs powersoftau new bn128 ${PTAU_POWER} universal-trusted-setup/pot${PTAU_POWER}_0000.ptau -v

echo "Adding randomness (entropy) contributions..."
echo "First contribution..."
snarkjs powersoftau contribute universal-trusted-setup/pot${PTAU_POWER}_0000.ptau universal-trusted-setup/pot${PTAU_POWER}_0001.ptau --name="First contribution" -v

echo "Second contribution..."
snarkjs powersoftau contribute universal-trusted-setup/pot${PTAU_POWER}_0001.ptau universal-trusted-setup/pot${PTAU_POWER}_0002.ptau --name="Second contribution" -v

echo "Phase 2 of universal trusted setup..."
echo "Transforming the universal setup to a format suitable for PLONK..."
snarkjs powersoftau prepare phase2 universal-trusted-setup/pot${PTAU_POWER}_0002.ptau universal-trusted-setup/pot${PTAU_POWER}_final.ptau 

echo "-----------------"
echo "- Step 2...Done -"
echo "-----------------"
