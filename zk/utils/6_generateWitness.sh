#!/bin/bash

echo "Generating the witness for the membership proof based on the input values..."
snarkjs wtns calculate build/membership-circuit/membership_js/membership.wasm \
                       inputs/membership_input_LIMT.json \
                       build/membership-circuit/witness.wtns

echo "Exporting the witness .wtns file to .json..."
snarkjs wtns export json build/membership-circuit/witness.wtns \
                         build/membership-circuit/witness.json

echo "-------------------------------------------------------------------------------------"
echo "- Generating the witness for the FALSE membership proof based on the input values...-"
echo "                         THIS STEP SHOULD FAIL!!"
echo "-------------------------------------------------------------------------------------"

if snarkjs wtns calculate build/membership-circuit/membership_js/membership.wasm \
                       inputs/membership_input_FALSEPROOF.json \
                       build/membership-circuit/witness_FALSEPROOF.wtns; then
   echo "False witness calculation unexpectedly succeeded!"
else
   echo ""
   echo "False witness calculation failed as expected!"
fi

echo "-----------------"
echo "- Step 6...Done -"
echo "-----------------"