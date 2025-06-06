#!/bin/bash

echo "Generating the proof for the membership inputs..."
snarkjs plonk prove build/membership-circuit/membership_final.zkey  \
                    build/membership-circuit/witness.wtns \
                    build/membership-circuit/proof.json \
                    build/membership-circuit/public.json
                    
echo "-----------------"
echo "- Step 7...Done -"
echo "-----------------"
