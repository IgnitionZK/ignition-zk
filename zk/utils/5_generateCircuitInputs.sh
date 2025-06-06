#!/bin/bash

echo "Creating a file with the poseidon-hashed leaves from the members address list..."
node scripts/createHashedLeaves.js

echo "Using Fixed-Merkle-Tree by TornadoCash:"
echo "---------------------------------------"
echo "Generating the merkle tree and dummy input values for circuit..."
node scripts/createMerkleTree-FixedMerkleTree.js

echo "Using Incremental-Merkle-Tree by ZK-Kit:"
echo "---------------------------------------"
echo "Generating the merkle tree and dummy input values for circuit..."
node scripts/createMerkleTree-IMT.js

echo "-----------------"
echo "- Step 5...Done -"
echo "-----------------"
