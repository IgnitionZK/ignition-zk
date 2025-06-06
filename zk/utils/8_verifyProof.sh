#!/bin/bash

echo "--------------------------------"
echo "Verifying the (VALID) proof off-chain..."
echo "--------------------------------"
snarkjs plonk verify build/membership-circuit/verification_key.json \
                     build/membership-circuit/public.json \
                     build/membership-circuit/proof.json

echo "--------------------------------"
echo "Verifying the (VALID) proof on-chain..."
echo "--------------------------------"
npx hardhat run scripts/verifyMembershipProof.js --network sepolia

echo "-----------------"
echo "- Step 8...Done -"
echo "-----------------"
