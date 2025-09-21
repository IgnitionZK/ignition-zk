#!/bin/bash

# Exit on error
set -e

# Create Python virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Slither
pip install slither-analyzer

echo "Slither installation complete. To activate the venv, run: source venv/bin/activate"
echo "To run Slither, use the command: ./static-analysis-slither.sh"
echo "The Slither report will be saved in slither-report.txt"
echo "To deactivate the venv, run: deactivate"