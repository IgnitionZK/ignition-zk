// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IProposalClaimVerifier} from "../interfaces/IProposalClaimVerifier.sol";

contract MockProposalClaimVerifier is IProposalClaimVerifier {

    bool private isValid = true; 

    function setIsValid(bool _isValid) external {
        isValid = _isValid;
    }

    function verifyProof(uint256[24] calldata _proof, uint256[3] calldata _pubSignals) public view returns (bool) {
        return isValid;
    }

}