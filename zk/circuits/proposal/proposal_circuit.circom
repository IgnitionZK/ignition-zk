pragma circom 2.2.2;


include "../../circomlib/circuits/poseidon.circom";
include "../../circomlib/circuits/comparators.circom";
include "../membership/membership_circuit.circom";


/** 
 * @title ProposalSubmissionProof
 * @notice Verifies that a proposal is valid by checking its content hash, membership, and submission uniqueness.
 * @dev Utilizes a Merkle proof for membership verification and Poseidon hash for content and nullifier computations.
 */
template ProposalSubmissionProof(treeLevels) {

    // Public inputs
    /**
     * @notice root: the public Merkle root of the group membership tree.
     * @dev The computed root has to match this value.
     */
    signal input root;
    /**
     * @notice proposalContentHash: the hash of the proposal content, which is used to derive the proposal nullifier.
     * @dev This value is revealed in the public output.
     */
    signal input proposalContentHash;

    // Private inputs
    /**
     * @notice identityTrapdoor: the secret key that is used in the generation of the final identity commitment.
     * @notice identityNullifier: the nullifier key that is used together with the identityTrapdoor in the generation of the final identity commitment.
     
     */
    signal input identityTrapdoor;
    signal input identityNullifier;
    /**
     * @notice pathElements: the sibling nodes of the current hash at each tree level (layer).
     * @notice pathIndices: the indices of the sibling nodes at each tree level (layer).
     * @dev The current hash needs to be combined with the sibling node at each layer.
     */
    signal input pathElements[treeLevels];
    signal input pathIndices[treeLevels];

    /** 
     * @notice proposalTitleHash: the hash of the proposal title.
     * @notice proposalDescriptionHash: the hash of the proposal description.
     * @notice proposalPayloadHash: the hash of the proposal payload.
     * @dev These values are used to compute the proposal content hash.
     */
    signal input proposalTitleHash;
    signal input proposalDescriptionHash;
    signal input proposalPayloadHash;

    /**
     * @notice groupHash: the hash of the group context, which is used to derive the proposal nullifier.
     * @notice epochHash: the hash of the epoch context, which is used to derive the proposal nullifier.
     */
    signal input groupHash; // context(group)
    signal input epochHash; // context(epoch)

    // 1. Membership verification
    /**
     * @notice member: the MembershipProof component that verifies if the identity is a member of the group.
     * @dev It checks the Merkle proof against the provided root and computes the public membership nullifier.
     */
    component member = MembershipProof(treeLevels);
    member.root <== root;
    member.identityTrapdoor <== identityTrapdoor;
    member.identityNullifier <== identityNullifier;
    member.groupHash <== groupHash;
    member.pathElements <== pathElements;
    member.pathIndices <== pathIndices;

    // the following may not be needed
    //signal output membershipNullifier;
    //membershipNullifier <== member.publicNullifier;

    /**
     * @notice computedProposalContentHash: the hash of the proposal content, computed from the title, description, and payload hashes.
     * @dev This is done using the Poseidon hash function with three inputs: title, description, and payload hashes.
     * The computed hash is then compared to the provided proposalContentHash.
     * @dev This ensures that the proposal content is valid and matches the expected hash.
     */

    signal computedProposalContentHash;
    component contentHash = Poseidon(3);
    contentHash.inputs[0] <== proposalTitleHash;
    contentHash.inputs[1] <== proposalDescriptionHash;
    contentHash.inputs[2] <== proposalPayloadHash;
    computedProposalContentHash <== contentHash.out;

    computedProposalContentHash === proposalContentHash;

    /**
     * @notice proposalContextHash: the hash of the context (group, epoch) for the proposal.
     * @dev This is computed using the Poseidon hash function with two inputs: groupHash and epochHash.
     * The resulting hash is used to derive the proposal nullifier.
     */
    signal output proposalContextHash; // context(group, epoch)
    component contextHash = Poseidon(2);
    contextHash.inputs[0] <== groupHash;
    contextHash.inputs[1] <== epochHash;
    proposalContextHash <== contextHash.out;

    /**
     * @notice proposalNullifier: the final nullifier that is computed from the proposalContextHash and proposalContentHash.
     * @dev This is done using the Poseidon hash function with two inputs: proposalContextHash and proposalContentHash.
     * The resulting hash is used to ensure that the proposal is unique within the context of the group and epoch.
     * @dev This prevents duplicate proposals from being submitted for the same group and epoch.
     */
    signal output proposalNullifier;
    component proposalNullifierHash = Poseidon(2);
    proposalNullifierHash.inputs[0] <== proposalContextHash;
    proposalNullifierHash.inputs[1] <== computedProposalContentHash;
    proposalNullifier <== proposalNullifierHash.out;
}

/**
 * @notice main: the main component that instantiates the ProposalSubmissionProof circuit.
 * @dev It declares the public inputs and sets the tree levels for the circuit.
 */
component main {public [root, proposalContentHash]} = ProposalSubmissionProof(10);

