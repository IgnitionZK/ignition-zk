pragma circom 2.2.2;
include "../../circomlib/circuits/poseidon.circom";

template ProposalClaimProof() {
    // Public Inputs
    signal input proposalClaimNullifier; // The public proposal claim hash
    signal input proposalSubmissionNullifier;    // The proposal submission nullifier (content + context hashes)
    signal input proposalContextHash; // The public proposal context hash (group + epoch)

    // Private Inputs
    signal input identityNullifier;
    signal input identityTrapdoor;

    // Compute the expected claim nullifier from private inputs
    // each accepted proposal can be claimed only once
    signal output computedClaimNullifier;
    component claimNullifierHasher = Poseidon(3);
    claimNullifierHasher.inputs[0] <== identityTrapdoor;
    claimNullifierHasher.inputs[1] <== identityNullifier;
    claimNullifierHasher.inputs[2] <== proposalSubmissionNullifier;
    computedClaimNullifier <== claimNullifierHasher.out;

    // Verifier enforces the following constraint: Assert that the computed claim nullifier matches the public one
    // ProposalManager.verifyProposalClaim also ensures that the claim nullifier is unique and the proposal has not been claimed before.
    computedClaimNullifier === proposalClaimNullifier;
}
component main {public [proposalClaimNullifier, proposalSubmissionNullifier, proposalContextHash]} = ProposalClaimProof();