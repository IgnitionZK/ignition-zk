#!/bin/bash
# Run Slither on the Hardhat project, excluding mocks and verifiers

slither hardhat --filter-paths 'verifiers|mocks|node_modules' > slither-report.txt 2>&1