#!/usr/bin/env bash
set -e

echo "===================================="
echo "🚀 Project Setup Starting..."
echo "===================================="

#
# Step 1: Install JS/TS dependencies in each workspace
#
for dir in hardhat zk frontend; do
    if [ -f "$dir/package.json" ]; then
        echo "📦 Installing Node.js dependencies in $dir..."
        (cd "$dir" && npm install)
    fi
done

#
# Step 2: Ensure Foundry is installed
#
echo "🔨 Checking Foundry installation..."
export PATH="$HOME/.foundry/bin:$PATH"

if ! command -v forge &> /dev/null; then
    echo "⚡ Foundry not found. Installing..."
    curl -L https://foundry.paradigm.xyz | bash

    # Detect shell and source correct file if possible
    if [ -n "$ZSH_VERSION" ] && [ -f "$HOME/.zshenv" ]; then
        source "$HOME/.zshenv"
    elif [ -n "$BASH_VERSION" ] && [ -f "$HOME/.bashrc" ]; then
        source "$HOME/.bashrc"
    fi

    export PATH="$HOME/.foundry/bin:$PATH"
else
    echo "✅ Foundry already installed."
fi

echo "📡 Updating Foundry..."
foundryup

#
# Step 3: Initialize Foundry project (optional)
#
if [ -d "foundry" ]; then
    echo "📂 Setting up Foundry project..."
    cd foundry
    forge install || true   # install dependencies (skip errors if already done)
    forge build || true     # build contracts
    cd ..
fi

echo "===================================="
echo "✅ Project Setup Complete!"
echo "===================================="