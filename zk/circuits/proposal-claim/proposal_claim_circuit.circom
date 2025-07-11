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
     * @notice the public proposal claim hash, which is used to verify the uniqueness of the claim.
     * @notice proposalSubmissionNullifier: the proposal submission nullifier (content + context hashes).
     * @notice proposalContextHash: the public proposal context hash (group + epoch).
     * @dev These values are fetched from the DB and are used to verify the claim.
     */
    signal input proposalClaimNullifier; 
    signal input proposalSubmissionNullifier;   
    signal input proposalContextHash; 

    // Private Inputs
    /**
     * @notice identityNullifier: the nullifier key that is used together with the identityTrapdoor in the generation of the final identity commitment.
     * @notice identityTrapdoor: the secret key that is used in the generation of the final identity commitment.
     * @dev These values are used to compute the claim nullifier.
     */
    signal input identityNullifier;
    signal input identityTrapdoor;

    /**
     * @notice groupHash: the hash of the group context, which is used to derive the proposal context hash.
     * @notice epochHash: the hash of the epoch context, which is used to derive the proposal context hash.
     * @dev These values are fetched from the frontend. 
     * They correspond to the hashed values of the group and epoch for the proposal the claim is being made on.
     *
     */
    signal input groupHash;
    signal input epochHash; 

    /**
     * @notice computedProposalContextHash: the computed proposal context hash, which is derived from the group and epoch hashes.
     * @dev This value is used to verify the uniqueness of the proposal context.
     * The proposal context hash is computed as the Poseidon hash of the group and epoch hashes.
     * The proposal context hash is used to ensure that the claim is made for the correct proposal
     */
    signal computedProposalContextHash;
    component proposalContextHasher = Poseidon(2);
    proposalContextHasher.inputs[0] <== groupHash;
    proposalContextHasher.inputs[1] <== epochHash;
    computedProposalContextHash <== proposalContextHasher.out;

    /**
     * @notice The computed proposal context hash must match the public proposal context hash.
     * @dev This ensures that the claim is made for the correct proposal context.
     */
    computedProposalContextHash === proposalContextHash;

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