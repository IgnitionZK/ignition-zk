#!/bin/bash
# Run Aderyn on the Hardhat project, excluding mocks and verifiers

cd hardhat
npx aderyn --path-excludes verifiers,mocks
cd ..
