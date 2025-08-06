# Proposal Claim Circuit Documentation

## Overview

The Proposal Claim circuit enables users to anonymously claim funds for approved proposals while proving they are the original proposer. This circuit is much simpler than the proposal circuit and focuses solely on validating that the claimer is the original proposer by verifying they possess the same `identityNullifier` that was used in the proposal creation.

## Circuit Inputs

### Public Inputs

- `proposalClaimNullifier`: The nullifier that prevents double-claiming of proposal funds
- `proposalSubmissionNullifier`: The nullifier that links to the original proposal submission
- `proposalContextHash`: The hash of the context (group + epoch)

### Private Inputs

- `identityNullifier`: The private nullifier of the identity that submitted the original proposal

## Circuit Logic

The circuit performs a single critical verification:

1. **Claim Nullifier Verification**:
   - Computes a claim nullifier from the user's `identityNullifier` and the `proposalSubmissionNullifier`
   - Verifies this computed nullifier matches the provided `proposalClaimNullifier`
   - This proves the claimer is the original proposer without revealing their identity

## Data Flow

The circuit performs the following steps:
1. Takes the user's `identityNullifier` as a private input
2. Takes the `proposalSubmissionNullifier` and `proposalClaimNullifier` as public inputs
3. Re-computes the proposal submission nullifier hash using the private `identityNullifier` and public `proposalSubmissionNullifier`

```
component claimNullifierHasher = Poseidon(2);
    claimNullifierHasher.inputs[0] <== identityNullifier;
    claimNullifierHasher.inputs[1] <== proposalSubmissionNullifier;
```

4. Verifies this computed hash matches the provided `proposalClaimNullifier`

## Constraints

The circuit enforces the following constraint:

1. **Claim Nullifier Constraint**:

```
computedClaimNullifier <== claimNullifierHasher.out;
```

This constraint ensures that:
- The user knows the original `identityNullifier` used to create the proposal
- The claim is tied to a specific proposal via the `proposalSubmissionNullifier`
- Each proposal can only be claimed once (enforced by the contract checking for nullifier reuse)

## Security Considerations

- **Double-Claiming Prevention**: The `proposalClaimNullifier` is recorded on-chain to prevent the same proposal from being claimed multiple times
- **Identity Verification**: Only the original proposer (who knows the `identityNullifier`) can generate a valid proof
- **No Merkle Proof Required**: Unlike the proposal submission circuit, this circuit does not verify group membership again, as this was already verified during proposal submission
- **Privacy Preservation**: The claimer's identity remains private, as the `identityNullifier` is never revealed

## Circuit Implementation

The circuit is minimal and focused, using only:
- A single Poseidon hash for the nullifier computation
- A single equality constraint to verify the claim

## Implementation Notes

- The circuit intentionally separates claiming from proposal submission to allow for time-delayed claiming after voting
- The `proposalContextHash` is included as a public input but is not directly used in the circuit's constraints