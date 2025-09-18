// SPDX-License-Identifier: MIT
pragma solidity >=0.8.28 <0.9.0;

import {IProposalVerifier} from "../interfaces/verifiers/IProposalVerifier.sol";

contract MockProposalVerifierV2 is IProposalVerifier {
    error MockVerifierV2Reverted();

    function verifyProof(uint256[24] calldata _proof, uint256[5] calldata _pubSignals) public view returns (bool) {
        revert MockVerifierV2Reverted();
    }

}