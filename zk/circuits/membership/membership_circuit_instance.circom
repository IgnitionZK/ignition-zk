pragma circom 2.2.2;


include "../../circomlib/circuits/poseidon.circom";
include "../../circomlib/circuits/comparators.circom";
include "../membership/membership_circuit.circom";


template MembershipCircuitInstance(treeLevels) {

    /**
     * @notice root: the public Merkle root of the group membership tree.
     * @dev The computed root has to match this value.
     */
    signal input root;

    /**
     * @notice identityTrapdoor: the secret key that is used in the generation of the final identity commitment.
     * @notice identityNullifier: the nullifier key that is used together with the identityTrapdoor in the generation of the final identity commitment.
     
     */
    signal input identityTrapdoor;
    signal input identityNullifier;

    /**
     * @notice groupHash: the hash of the group (DAO) context.
     * @dev This value is revealed in the public output.
     */
    signal input groupHash; 

    /**
     * @notice pathElements: the sibling nodes of the current hash at each tree level (layer).
     * @notice pathIndices: the indices of the sibling nodes at each tree level (layer).
     * @dev The current hash needs to be combined with the sibling node at each layer.
     */
    signal input pathElements[treeLevels];
    signal input pathIndices[treeLevels];
    
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
}

component main {public [root, groupHash]} = MembershipCircuitInstance(10);