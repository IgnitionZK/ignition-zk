#!/bin/bash

echo "============================="	
echo "    Hardhat Unit Tests       "
echo "============================="
(cd hardhat && npx hardhat test) || exit 1

echo "============================="
echo "    Foundry Fuzz Tests       "
echo "============================="
(cd foundry && forge test -vv) || exit 1