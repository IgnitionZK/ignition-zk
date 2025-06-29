// !!!
// THIS FILE IS JUST A DRAFT AND NOT READY FOR PRODUCTION USE 
// !!!
pragma circom 2.2.2;


include "../../circomlib/circuits/poseidon.circom";
include "../../circomlib/circuits/comparators.circom";
include "../membership/membership_circuit.circom";

// Verify that a vote is valid by
// a) checking that the voter is a member of the group that can vote
// b) checking that the vote is not already cast for the given proposal_id within the group and epoch. (onchain check via the vote nullifier)
// c) that the vote content is valid (e.g. vote choice, timestamp, etc.) -- TO DO 

template VotingProof(treeLevels) {

    // Public inputs
    signal input root;
    signal input voteContentHash; // hash of the vote content, e.g. vote choice, timestamp, etc.

    // Private inputs
    signal input identityTrapdoor;
    signal input identityNullifier;
    signal input pathElements[treeLevels];
    signal input pathIndices[treeLevels];
    signal input groupHash; // context(group)
    signal input epochHash; // context(epoch)
    signal input proposalHash; // context(proposal)

    // 1. Membership verification
    component member = MembershipProof(treeLevels);
    member.root <== root;
    member.identityTrapdoor <== identityTrapdoor;
    member.identityNullifier <== identityNullifier;
    member.groupHash <== groupHash;
    member.pathElements <== pathElements;
    member.pathIndices <== pathIndices;

    // 2. check that the vote is not already cast by computing the vote nullifier and validating it on-chain.
    // Allow one vote per proposal per group per epoch
    signal output voteContextHash; // context(group, epoch, proposal)
    component contextHash = Poseidon(3);
    contextHash.inputs[0] <== groupHash;
    contextHash.inputs[1] <== epochHash;
    contextHash.inputs[2] <== proposalHash;
    voteContextHash <== contextHash.out;

    // Compute the vote nullifier
    signal output voteNullifier;
    component voteNullifierHash = Poseidon(2);
    voteNullifierHash.inputs[0] <== identityNullifier;
    voteNullifierHash.inputs[1] <== voteContextHash;
    voteNullifier <== voteNullifierHash.out;

    // 3. Check that the vote content is valid

}

component main {public [root, voteContentHash]} = VotingProof(10); 