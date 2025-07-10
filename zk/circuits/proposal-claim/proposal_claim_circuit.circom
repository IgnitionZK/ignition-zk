pragma circom 2.2.2;
include "../../circomlib/circuits/poseidon.circom";

/**
 * @title ProposalClaimProof
 * @notice Verifies that a proposal claim is valid by checking the public claim nullifier against the computed claim nullifier using the public proposal submission nullifier and private zk identity.
 * @dev Utilizes Poseidon hash for claim nullifier computation.
 */
template ProposalClaimProof() {
    // Public Inputs
    /**
     * @notice proposalClaimNullifier: the public proposal claim hash, which is used to verify the uniqueness of the claim.
     * @notice proposalSubmissionNullifier: the proposal submission nullifier (content + context hashes).
     * @notice proposalContextHash: the public proposal context hash (group + epoch).
     */
    signal input proposalClaimNullifier; // The public proposal claim hash
    signal input proposalSubmissionNullifier;    // The proposal submission nullifier (content + context hashes)
    signal input proposalContextHash; // The public proposal context hash (group + epoch)

    // Private Inputs
    /**
     * @notice identityNullifier: the nullifier key that is used together with the identityTrapdoor in the generation of the final identity commitment.
     * @notice identityTrapdoor: the secret key that is used in the generation of the final identity commitment.
     * @dev These values are used to compute the claim nullifier.
     */
    signal input identityNullifier;
    signal input identityTrapdoor;

    /**
     * @notice computedClaimNullifier: the computed claim nullifier, which is derived from the identity trapdoor, identity nullifier, and proposal submission nullifier.
     * @dev This value is used to verify the uniqueness of the claim.
     * The claim nullifier is computed as the Poseidon hash of the identity trapdoor, identity nullifier, and proposal submission nullifier.
     */
    signal computedClaimNullifier;
    component claimNullifierHasher = Poseidon(3);
    claimNullifierHasher.inputs[0] <== identityTrapdoor;
    claimNullifierHasher.inputs[1] <== identityNullifier;
    claimNullifierHasher.inputs[2] <== proposalSubmissionNullifier;
    computedClaimNullifier <== claimNullifierHasher.out;

    /**
     * @notice The computed claim nullifier must match the public proposal claim nullifier.
     * @dev This ensures that the user submitting the claim is the same user who submitted the proposal.
     * The uniqueness of the claim is enforced by the ProposalManager, which checks that the claim nullifier has not been used before.
     * This is crucial to prevent double claiming of the same proposal.
     */
    computedClaimNullifier === proposalClaimNullifier;
}
/**
 * @notice The main component of the circuit, which includes the public inputs and the proposal claim proof.
 */
component main {public [proposalClaimNullifier, proposalSubmissionNullifier, proposalContextHash]} = ProposalClaimProof();