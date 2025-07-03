# Proposal Circuit Documentation

## Overview

The Proposal Circuit is a zero-knowledge proof system implemented in Circom that enables private verification of proposal submissions within a group governance system. This circuit allows group members to submit proposals while maintaining privacy and ensuring proposal uniqueness through cryptographic commitments and nullifiers.

## Circuit Description

The ProposalSubmissionProof circuit implements a privacy-preserving proposal submission system that combines membership verification with proposal content validation. The circuit takes a user's secret credentials, proposal content hashes, group and epoch context, and a Merkle proof path to verify both membership and proposal validity without revealing the user's identity or the full proposal content. The system uses the Poseidon hash function for all cryptographic operations and generates unique proposal nullifiers to prevent duplicate submissions.

## Circuit Template Structure

### Template Declaration

```circom
template ProposalSubmissionProof(treeLevels)
```

- **Parameter**: `treeLevels` (integer) - The number of levels in the membership Merkle tree
- **Purpose**: Defines the circuit structure with configurable tree depth for membership verification

## Input Signals

### Public Inputs

- **`root`** (field element): The known Merkle root of the group's membership tree
- **`proposalContentHash`** (field element): The expected hash of the proposal content for validation

### Private Inputs

- **`identityTrapdoor`** (field element): Secret key used in identity commitment generation
- **`identityNullifier`** (field element): Nullifier key used with trapdoor for commitment
- **`pathElements[treeLevels]`** (array of field elements): Sibling nodes at each tree level for Merkle proof
- **`pathIndices[treeLevels]`** (array of field elements): Position indicators (0=left, 1=right) for each level
- **`proposalTitleHash`** (field element): Hash of the proposal title
- **`proposalDescriptionHash`** (field element): Hash of the proposal description
- **`proposalPayloadHash`** (field element): Hash of the proposal payload
- **`groupHash`** (field element): Hash of the group context for nullifier generation
- **`epochHash`** (field element): Hash of the epoch context for nullifier generation

## Output Signals

### Public Outputs

- **`proposalContextHash`** (field element): Computed hash of group and epoch context
- **`proposalNullifier`** (field element): Unique nullifier derived from context and content hashes

## Step-by-Step Circuit Flow

### 1. Membership Verification

```circom
component member = MembershipProof(treeLevels);
member.root <== root;
member.identityTrapdoor <== identityTrapdoor;
member.identityNullifier <== identityNullifier;
member.groupHash <== groupHash;
member.pathElements <== pathElements;
member.pathIndices <== pathIndices;
```

**Purpose**: Verifies that the proposal submitter is a valid group member
**Data Flow**:

- Input: All membership-related signals passed to MembershipProof component
- Output: Implicit membership verification (circuit fails if not a member)
- **Note**: The membership nullifier is computed but not exposed as output

### 2. Proposal Content Hash Computation

```circom
signal computedProposalContentHash;
component contentHash = Poseidon(3);
contentHash.inputs[0] <== proposalTitleHash;
contentHash.inputs[1] <== proposalDescriptionHash;
contentHash.inputs[2] <== proposalPayloadHash;
computedProposalContentHash <== contentHash.out;
```

**Purpose**: Computes the hash of the proposal content from its components
**Data Flow**:

- Input: `proposalTitleHash` (field element)
- Input: `proposalDescriptionHash` (field element)
- Input: `proposalPayloadHash` (field element)
- Output: `computedProposalContentHash` (field element) via Poseidon hash

### 3. Content Hash Validation

```circom
computedProposalContentHash === proposalContentHash;
```

**Purpose**: Ensures the computed content hash matches the provided public hash
**Effect**: Circuit will only generate valid proofs when content hashes match

### 4. Proposal Context Hash Generation

```circom
signal output proposalContextHash;
component contextHash = Poseidon(2);
contextHash.inputs[0] <== groupHash;
contextHash.inputs[1] <== epochHash;
proposalContextHash <== contextHash.out;
```

**Purpose**: Creates a unique context identifier for the proposal
**Data Flow**:

- Input: `groupHash` (field element)
- Input: `epochHash` (field element)
- Output: `proposalContextHash` (field element) via Poseidon hash

### 5. Proposal Nullifier Generation

```circom
signal output proposalNullifier;
component proposalNullifierHash = Poseidon(2);
proposalNullifierHash.inputs[0] <== proposalContextHash;
proposalNullifierHash.inputs[1] <== computedProposalContentHash;
proposalNullifier <== proposalNullifierHash.out;
```

**Purpose**: Creates a unique nullifier to prevent duplicate proposal submissions
**Data Flow**:

- Input: `proposalContextHash` (field element)
- Input: `computedProposalContentHash` (field element)
- Output: `proposalNullifier` (field element) via Poseidon hash

## Data Type Summary

### Field Elements

- All input/output signals are field elements (finite field arithmetic)
- Compatible with elliptic curve cryptography operations
- Range: 0 to p-1 (where p is the field modulus)

### Arrays

- `pathElements[treeLevels]`: Array of field elements for Merkle proof
- `pathIndices[treeLevels]`: Array of field elements (binary values) for Merkle proof

### Component Instances

- `member`: MembershipProof component instance
- `contentHash`: Poseidon(3) component for content hashing
- `contextHash`: Poseidon(2) component for context hashing
- `proposalNullifierHash`: Poseidon(2) component for nullifier generation

## Security Features

1. **Privacy**: User's identity and proposal content details are never revealed
2. **Membership Verification**: Only valid group members can submit proposals
3. **Content Integrity**: Proposal content is cryptographically bound to the proof
4. **Non-reusability**: Proposal nullifier prevents duplicate submissions
5. **Context-specific**: Nullifiers are tied to specific group and epoch contexts
6. **Unforgeability**: Only valid proposals with correct content hashes can generate proofs

## Usage Notes

- The circuit template requires instantiation with a specific tree depth matching the membership tree
- All Merkle proof paths must be padded to the specified tree level
- Proposal content must be pre-hashed before submission (title, description, payload)
- The circuit enforces both membership and content validity through constraint satisfaction
- Public nullifier enables efficient proposal deduplication and verification
- Context hashing allows for epoch-based proposal management
- The membership nullifier is computed but not exposed, maintaining privacy while enabling internal tracking
