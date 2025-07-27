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
     * @notice proposalMetadataHash: the hash of the proposal metadata.
     * @notice proposalFundingHash: the hash of the proposal funding.
     * @dev These values are used to compute the proposal content hash.
     */
    signal input proposalTitleHash;
    signal input proposalDescriptionHash;
    signal input proposalPayloadHash;
    signal input proposalMetadataHash; 
    signal input proposalFundingHash;

    /**
     * @notice groupHash: the hash of the group context, which is used to derive the proposal submission nullifier.
     * @notice epochHash: the hash of the epoch context, which is used to derive the proposal submission nullifier.
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

    //signal output membershipNullifier;
    //membershipNullifier <== member.publicNullifier;

    /**
     * @notice computedProposalContentHash: the hash of the proposal content, computed from the title, description, funding, metadata and payload hashes.
     * @dev This is done using the Poseidon hash function with five inputs: title, description, funding, metadata, and payload hashes.
     * The computed hash is then compared to the provided proposalContentHash.
     * This ensures that the proposal content is valid and matches the expected hash.
     */

    signal computedProposalContentHash;
    component contentHash = Poseidon(5);
    contentHash.inputs[0] <== proposalTitleHash;
    contentHash.inputs[1] <== proposalDescriptionHash;
    contentHash.inputs[2] <== proposalFundingHash; 
    contentHash.inputs[3] <== proposalMetadataHash; 
    contentHash.inputs[4] <== proposalPayloadHash;
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
     * @notice proposalSubmissionNullifier: the final nullifier that is computed from the proposalContextHash and proposalContentHash.
     * @dev This is done using the Poseidon hash function with two inputs: proposalContextHash and proposalContentHash.
     * The resulting hash is used to ensure that the proposal is unique within the context of the group and epoch.
     * This prevents duplicate proposals from being submitted for the same group and epoch.
     */
    signal output proposalSubmissionNullifier;
    component proposalSubmissionNullifierHash = Poseidon(2);
    proposalSubmissionNullifierHash.inputs[0] <== proposalContextHash;
    proposalSubmissionNullifierHash.inputs[1] <== computedProposalContentHash;
    proposalSubmissionNullifier <== proposalSubmissionNullifierHash.out;

    /**
     * @notice proposalClaimNullifier: the nullifier that is used to ensure that once accepted a proposal can only be claimed once.
     * @dev This is computed using the Poseidon hash function with three inputs: identityTrapdoor, identityNullifier, and proposalSubmissionNullifier.
     * It ensures that the proposal can only be claimed by the identity that submitted it, and prevents double claiming.
     * It connects the identity with the unique proposal submission nullifier. It therefore encapsulates identity + content + context
     */
    signal output proposalClaimNullifier; 
    component proposalClaimHash = Poseidon(2);
    proposalClaimHash.inputs[0] <== identityNullifier;
    proposalClaimHash.inputs[1] <== proposalSubmissionNullifier; 
    proposalClaimNullifier <== proposalClaimHash.out;
}

/**
 * @notice main: the main component that instantiates the ProposalSubmissionProof circuit.
 * @dev It declares the public inputs and sets the tree levels for the circuit.
 */
component main {public [root, proposalContentHash]} = ProposalSubmissionProof(10);

