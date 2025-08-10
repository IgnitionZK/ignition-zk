// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IProposalVerifier} from "../interfaces/verifiers/IProposalVerifier.sol";

contract MockProposalVerifier is IProposalVerifier {

    bool private isValid = true; 

    function setIsValid(bool _isValid) external {
        isValid = _isValid;
    }

    function verifyProof(uint256[24] calldata _proof, uint256[5] calldata _pubSignals) public view returns (bool) {
        return isValid;
    }

}