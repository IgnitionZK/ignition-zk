const { ethers } = require("hardhat");

async function main() {
  function findMatchingError(selector, candidates) {
    for (const err of candidates) {
      const id = ethers.id(err).slice(0, 10);
      if (id === selector) {
        console.log(`Match found: ${err} => ${id}`);
      }
    }
  }

  const selector = "0x1bd0b3f5";

  const errorSignaturesMM = [
    "OwnableUnauthorizedAccount()",
    "RootCannotBeZero()",
    "InvalidMerkleRoot()",
    "NewRootMustBeDifferent()",
    "RootNotYetInitialized()",
    "RootAlreadyInitialized()",
    "GroupNftNotSet()",
    "GroupNftAlreadySet()",
    "NftAddressCannotBeZero()",
    "NftMustBeERC721()",
    "InvalidNftNameLength()",
    "InvalidNftSymbolLength()",
    "InvalidNftSymbolLength()",
    "MintingFailed(string reason)",
    "InvalidProof(bytes32 groupKey)",
    "InvalidGroupKey()",
    "MemberAlreadyHasToken()",
    "MemberDoesNotHaveToken()",
    "MemberBatchTooLarge()",
    "NoMembersProvided()",
    "MemberMustBeEOA()",
    "KeyCannotBeZero()",
    "AddressCannotBeZero()",
    "AddressIsNotAContract()",
    "AddressDoesNotSupportInterface()",
  ];

  const errorSignaturesPM = [
    "OwnableUnauthorizedAccount()",
    "InvalidMerkleRoot()",
    "RootAlreadyInitialized()",
    "RootNotYetInitialized()",
    "InvalidSubmissionProof(bytes32,bytes32)",
    "InvalidClaimProof(bytes32,bytes32,bytes32)",
    "SubmissionNullifierAlreadyUsed()",
    "ClaimNullifierAlreadyUsed()",
    "InvalidContextHash()",
    "InvalidContentHash()",
    "ProposalHasNotBeenSubmitted()",
    "ProposalHasAlreadyBeenClaimed()",
    "AddressCannotBeZero()",
    "AddressIsNotAContract()",
    "AddressDoesNotSupportInterface()",
    "KeyCannotBeZero()",
  ];

  const errorSignaturesVM = [
    "OwnableUnauthorizedAccount()",
    "InvalidMerkleRoot()",
    "RootNotYetInitialized()",
    "InvalidContextHash()",
    "VoteNullifierAlreadyUsed()",
    "InvalidVoteProof(bytes32,bytes32)",
    "InvalidVoteChoice()",
    "TallyingInconsistent()",
    "InvalidQuorumParams()",
    "InvalidGroupSizeParams()",
    "InvalidMemberCount()",
    "QuorumCannotBeLowerThan25()",
    "GroupParamsCannotBeZero()",
    "InvalidXInput()",
    "AddressIsNotAContract()",
    "AddressDoesNotSupportInterface()",
    "AddressCannotBeZero()",
    "KeyCannotBeZero()",
  ];

  findMatchingError(selector, errorSignaturesPM);
}

main().catch(console.error);
