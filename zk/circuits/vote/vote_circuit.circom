pragma circom 2.2.2;


include "../../circomlib/circuits/poseidon.circom";
include "../membership/membership_circuit.circom";

/**
 * @title VoteProof
 * @notice Verifies that a vote is valid by checking membership, uniqueness, vote choice, and content.
 * @dev Utilizes a Merkle proof for membership verification and Poseidon hash for content and nullifier computations.
 */
template VoteProof(treeLevels) {

    // Public inputs
    /**
     * @notice root: the public Merkle root of the group membership tree.
     * @dev The computed root has to match this value.
     */
    signal input root;

    // Private inputs
    /**
     * @notice voteChoice: the choice made by the voter (0 - Abstain, 1 - Yes, 2 - No).
     * @notice voteTimestamp: the timestamp of the vote.
     * @dev These values are used to compute the vote content hash.
     */
    signal input voteChoice; 
    signal input voteTimestamp; 

    /**
     * @notice identityTrapdoor: the secret key that is used in the generation of the final identity commitment.
     * @notice identityNullifier: the nullifier key that is used together with the identityTrapdoor in the generation of the final identity commitment.
     * @dev These values are not revealed in the public output.
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
     * @notice groupHash: the hash of the group context, which is used to derive the voteContextHash.
     * @notice epochHash: the hash of the epoch context, which is used to derive the voteContextHash.
     * @notice proposalHash: the hash of the proposal context, which is used to derive the voteContextHash.
     */
    signal input groupHash; 
    signal input epochHash; 
    signal input proposalHash; 

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

    // 2. Vote uniqueness verification (onchain check)
    /**
     * @notice voteContextHash: the hash of the context (group, epoch, proposal) used to derive the vote nullifier.
     * @dev This value is used to ensure that the vote is unique for the given context.
     * It is revealed in the public output.
     */
    signal output voteContextHash; 
    component contextHash = Poseidon(3);
    contextHash.inputs[0] <== groupHash;
    contextHash.inputs[1] <== epochHash;
    contextHash.inputs[2] <== proposalHash;
    voteContextHash <== contextHash.out;

    /**
     * @notice voteNullifier: the final nullifier that is computed from identityNullifier and voteContextHash.
     * @dev This value is used to ensure that each member can only vote once per context. 
     * The vote content is not included in the nullifier so that only one vote per proposal is allowed.
     * It is revealed in the public output and stored onchain.
     */
    signal output voteNullifier;
    component voteNullifierHash = Poseidon(2);
    voteNullifierHash.inputs[0] <== identityNullifier;
    voteNullifierHash.inputs[1] <== voteContextHash;
    voteNullifier <== voteNullifierHash.out;

    // 3. Vote choice verification 
    /**
     * @notice isValidVoteChoice: a signal that checks if the vote choice is valid.
     * @dev It ensures that the vote choice is one of the valid choices (0, 1, 2).
     * This is done by ensuring that the sum of the boolean checks equals 1 so that exactly one of the conditions has to be true.
     */
    signal isValidVoteChoice;

    var NO = 0;
    var YES = 1;
    var ABSTAIN = 2;

    component isZero = IsEqual();
    isZero.in[0] <== voteChoice;
    isZero.in[1] <== NO;

    component isOne = IsEqual();
    isOne.in[0] <== voteChoice;
    isOne.in[1] <== YES;

    component isTwo = IsEqual();
    isTwo.in[0] <== voteChoice;
    isTwo.in[1] <== ABSTAIN;

    isValidVoteChoice <== isZero.out + isOne.out + isTwo.out;
    isValidVoteChoice === 1;

    // 4. On-chain verifiable vote choice hash
    /**
     * @notice onChainVerifiableVoteChoiceHash: the Poseidon hash of the vote choice.
     * This value is revealed in the public output and can be used to infer the vote choice on-chain.
     */
    signal output onChainVerifiableVoteChoiceHash;
    component voteChoiceHasher = Poseidon(1);
    voteChoiceHasher.inputs[0] <== voteChoice;
    onChainVerifiableVoteChoiceHash <== voteChoiceHasher.out;
}

component main {public [root]} = VoteProof(10); 