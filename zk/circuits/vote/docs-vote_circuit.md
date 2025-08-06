# Vote Circuit Documentation

## Overview

The Vote Circuit enables users to anonymously cast votes on proposals while proving their group membership. This circuit verifies that:

1. The voter is a valid member of the group
2. The vote choice is valid (YES, NO, or ABSTAIN)
3. Each user can vote only once per proposal
4. The vote is linked to a specific proposal via the submission nullifier

## Circuit Inputs

### Public Inputs

- `root`: The Merkle tree root that represents the current state of group membership
- `proposalSubmissionNullifier`: The nullifier of the proposal being voted on
- `voteNullifier`: A unique nullifier preventing double-voting
- `voteContextHash`: Hash of the voting context (group + epoch + proposal)
- `onChainVerifiableVoteChoiceHash`: Hash of the vote choice, allowing on-chain verification

### Private Inputs

- **Identity credentials**:
  - `identityNullifier`: The private nullifier of the voter's identity
  - `identityTrapdoor`: The private trapdoor of the voter's identity
  - `treePathIndices`: The Merkle tree path indices
  - `treeSiblings`: The Merkle tree siblings

- **Vote data**:
  - `groupHash`: Hash of the group ID
  - `epochHash`: Hash of the epoch ID
  - `proposalHash`: Hash of the proposal ID
  - `voteChoice`: The user's vote (0=NO, 1=YES, 2=ABSTAIN)
  - `proposalTitleHash`: Hash of the proposal title
  - `proposalDescriptionHash`: Hash of the proposal description
  - `proposalFundingHash`: Hash of the proposal funding data
  - `proposalMetadataHash`: Hash of the proposal metadata
  - `proposalPayloadHash`: Hash of the proposal payload

## Circuit Logic

The circuit performs the following verifications:

1. **Identity verification**:
   - Computes the identity commitment from `identityNullifier` and `identityTrapdoor`
   - Verifies the Merkle proof against the provided root

2. **Vote choice validation**:
   - Verifies the vote choice is valid (0, 1, or 2)
   - Computes the vote choice hash for on-chain verification

3. **Nullifier generation**:
   - Generates a unique vote nullifier from the voter's identity and proposal context
   - This prevents double-voting while preserving anonymity

4. **Proposal verification**:
   - Computes the proposal content hash from all proposal details
   - Computes the proposal submission nullifier for linking to the original proposal
   - Ensures that the computed proposal submission nullifier matches the provided proposal submission nullifier

## Constraints

The circuit enforces the following constraints:

1. **Membership verification**:
``` 
isMember === 1 
```
2.  **Vote Choice Validation Constraint**:
```
isValidVoteChoice <== isZero.out + isOne.out + isTwo.out;isValidVoteChoice === 1;
```
Ensures the vote choice is one of the allowed values.

8. **Proposal Submission Nullifier Constraint**:
```
computedProposalSubmissionNullifier === proposalSubmissionNullifier;
```
Verifies the vote references a valid proposal.

## Security Considerations

- **Double-Voting Prevention**: The `voteNullifier` is recorded on-chain to prevent voting multiple times on the same proposal
- **Anonymity**: The voter's identity remains private, as the `identityNullifier` is never revealed
- **Vote Integrity**: The vote choice is hashed but can be verified on-chain
- **Valid Proposal Verification**: The circuit verifies the vote is for a valid proposal by checking the proposal submission nullifier
- **Group Membership**: Only valid group members (included in the Merkle tree) can cast votes

## Circuit Implementation

The circuit uses:

- **Poseidon Hash**: Efficient hash function optimized for ZK circuits
- **Merkle Tree Inclusion Proof**: For verifying group membership
- **IsEqual Component**: For validating vote choices
- **Equality Constraints**: For verifying computed nullifiers and hashes

## Related Components

- **Proposal Circuit**: Used to submit proposals before voting
- **Proposal Claim Circuit**: Used to claim funds after successful votes
- **Vote Verifier Contract**: On-chain component that verifies proofs and processes votes

## Implementation Notes

- All hash computations use Poseidon for efficiency on-chain
- The vote nullifier design prevents both double-voting and vote tracing
- The circuit includes the proposal submission nullifier verification to ensure votes are only cast on valid proposals
- The on-chain verifiable vote choice hash allows the contract to tally votes while maintaining privacy