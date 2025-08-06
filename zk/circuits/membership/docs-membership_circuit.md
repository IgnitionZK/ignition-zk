# Membership Circuit Documentation

## Overview

The Membership Circuit is a zero-knowledge proof system implemented in Circom that enables private verification of group membership without revealing the actual member's identity. This circuit allows users to prove they belong to a specific group (represented by a Merkle tree) while maintaining privacy through cryptographic commitments.

## Circuit Description

The MembershipProof circuit implements a privacy-preserving membership verification system using Merkle tree proofs and zero-knowledge cryptography. The circuit takes a user's secret credentials (identity trapdoor and nullifier), a group context hash, and a Merkle proof path to verify membership without revealing the user's actual identity. The system uses the Poseidon hash function for all cryptographic operations.

## Circuit Template Structure

### Template Declaration

```circom
template MembershipProof(treeLevels)
```

- **Parameter**: `treeLevels` (integer) - The number of levels in the Merkle tree
- **Purpose**: Defines the circuit structure with configurable tree depth

## Input Signals

### Public Inputs

- **`root`** (field element): The known Merkle root of the group's membership tree
- **`groupHash`** (field element): Hash of the group context

### Private Inputs

- **`identityTrapdoor`** (field element): Secret key used in identity commitment generation
- **`identityNullifier`** (field element): Nullifier key used with trapdoor for commitment
- **`pathElements[treeLevels]`** (array of field elements): Sibling nodes at each tree level for Merkle proof
- **`pathIndices[treeLevels]`** (array of field elements): Position indicators (0=left, 1=right) for each level

## Output Signals

### Public Outputs

- **`publicNullifier`** (field element): Computed nullifier derived from identity nullifier and group hash

## Step-by-Step Circuit Flow

### 1. Nullifier Generation

```circom
signal output publicNullifier;
component nullifierHash = Poseidon(2);
nullifierHash.inputs[0] <== identityNullifier;
nullifierHash.inputs[1] <== groupHash;
publicNullifier <== nullifierHash.out;
```

**Purpose**: Creates a unique, group-specific nullifier to prevent proof reuse
**Note** This value is not currently used as the membership circuit is used as a component within the proposal and vote circuits. To prevent double-use of proofs the proposal and vote nullifiers are used instead in their respective circuits.
**Data Flow**:

- Input: `identityNullifier` (field element)
- Input: `groupHash` (field element)
- Output: `publicNullifier` (field element) via Poseidon hash

### 2. Identity Commitment Creation

```circom
signal commitment;
component leaf = Poseidon(2);
leaf.inputs[0] <== identityNullifier;
leaf.inputs[1] <== identityTrapdoor;
commitment <== leaf.out;
```

**Purpose**: Generates the leaf node hash from user's secret credentials
**Data Flow**:

- Input: `identityNullifier` (field element)
- Input: `identityTrapdoor` (field element)
- Output: `commitment` (field element) via Poseidon hash

### 3. Merkle Tree Path Verification

#### 3.1 Path Setup

```circom
signal currentHash[treeLevels+1];
currentHash[0] <== commitment;
```

**Purpose**: Initializes the verification path starting from the leaf commitment
**Data Flow**: Sets initial hash value to the computed leaf commitment

#### 3.2 Iterative Hash Computation

For each tree level (i = 0 to treeLevels-1):

**a) Position Determination**

```circom
isLeft[i] <== 1 - pathIndices[i];
isRight[i] <== pathIndices[i];
```

**Purpose**: Determines if current hash is on left (0) or right (1) side
**Data Types**: Boolean signals derived from path indices

**b) Left Node Assignment**

```circom
left_a[i] <== isLeft[i] * currentHash[i];
left_b[i] <== isRight[i] * pathElements[i];
left[i] <== left_a[i] + left_b[i];
```

**Purpose**: Assigns appropriate hash to left position based on path index
**Logic**:

- If current hash is on left: left = currentHash[i]
- If current hash is on right: left = pathElements[i]

**c) Right Node Assignment**

```circom
right_a[i] <== isLeft[i] * pathElements[i];
right_b[i] <== isRight[i] * currentHash[i];
right[i] <== right_a[i] + right_b[i];
```

**Purpose**: Assigns appropriate hash to right position based on path index
**Logic**:

- If current hash is on left: right = pathElements[i]
- If current hash is on right: right = currentHash[i]

**d) Hash Combination**

```circom
hashValues[i] = Poseidon(2);
hashValues[i].inputs[0] <== left[i];
hashValues[i].inputs[1] <== right[i];
currentHash[i + 1] <== hashValues[i].out;
```

**Purpose**: Computes parent hash from left and right child hashes
**Data Flow**: Combines left and right hashes using Poseidon function

### 4. Root Verification

```circom
component checkEquality = IsEqual();
checkEquality.in[0] <== currentHash[treeLevels];
checkEquality.in[1] <== root;
isMember <== checkEquality.out;
```

**Purpose**: Verifies that computed root matches the known Merkle root
**Data Flow**:

- Input: Computed root (field element)
- Input: Known root (field element)
- Output: Boolean equality result

### 5. Membership Constraint

```circom
isMember === 1;
```

**Purpose**: Enforces that the proof must be valid (membership must be true)
**Effect**: Circuit will only generate valid proofs for actual group members

## Data Type Summary

### Field Elements

- All input/output signals are field elements (finite field arithmetic)
- Compatible with elliptic curve cryptography operations
- Range: 0 to p-1 (where p is the field modulus)

### Arrays

- `pathElements[treeLevels]`: Array of field elements
- `pathIndices[treeLevels]`: Array of field elements (binary values)
- `currentHash[treeLevels+1]`: Array of field elements
- `left[treeLevels]`, `right[treeLevels]`: Arrays of field elements

### Boolean Logic

- `isLeft[i]`, `isRight[i]`: Boolean signals (0 or 1)
- `isMember`: Boolean output signal

## Security Features

1. **Privacy**: User's identity credentials are never revealed
2. **Unforgeability**: Only valid group members can generate proofs
3. **Non-reusability**: Public nullifier prevents proof replay attacks
4. **Group-specific**: Nullifiers are tied to specific group contexts

## Usage Notes

- The circuit template requires instantiation with a specific tree depth
- All Merkle proof paths must be padded to the specified tree level
- The circuit enforces valid membership through constraint satisfaction
