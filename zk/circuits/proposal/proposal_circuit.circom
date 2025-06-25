pragma circom 2.2.2;


include "../../circomlib/circuits/poseidon.circom";
include "../../circomlib/circuits/comparators.circom";
include "../membership/membership_circuit.circom";

// Verify that a proposal is valid by 
// a) checking its content hash against the computed hash from its title, description, and payload.
// b) checking that the proposal is not already submitted within the group and epoch. (onchain check via the proposal nullifier)
// c) that the submitter is a member of the group that can submit proposals

template ProposalSubmissionProof(treeLevels) {

    // Public inputs
    signal input root;
    signal input proposalContentHash;

    // Private inputs
    signal input identityTrapdoor;
    signal input identityNullifier;
    signal input pathElements[treeLevels];
    signal input pathIndices[treeLevels];
    signal input proposalTitleHash;
    signal input proposalDescriptionHash;
    signal input proposalPayloadHash;
    signal input groupHash; // context(group)
    signal input epochHash; // context(epoch)

    // 1. Membership verification
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

    // constraint already enforced in the membership circuit
    //member.isMember === 1;

    // 2. check that the contents of the proposal match the proposal hash

    signal computedProposalContentHash;
    component contentHash = Poseidon(3);
    contentHash.inputs[0] <== proposalTitleHash;
    contentHash.inputs[1] <== proposalDescriptionHash;
    contentHash.inputs[2] <== proposalPayloadHash;
    computedProposalContentHash <== contentHash.out;

    computedProposalContentHash === proposalContentHash;

    // 3. check that the proposal is not already submitted by computing the proposal nullifier and validating it on-chain.
    // Allow one submission per proposal per group per epoch 

    signal output proposalContextHash; // context(group, epoch)
    component contextHash = Poseidon(2);
    contextHash.inputs[0] <== groupHash;
    contextHash.inputs[1] <== epochHash;
    proposalContextHash <== contextHash.out;

    signal output proposalNullifier;
    component proposalNullifierHash = Poseidon(2);
    proposalNullifierHash.inputs[0] <== proposalContextHash;
    proposalNullifierHash.inputs[1] <== proposalHash;
    proposalNullifier <== proposalNullifierHash.out;
}

component main {public [root, proposalContentHash]} = ProposalSubmissionProof(10);

