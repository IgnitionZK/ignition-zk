// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


interface IVoteVerifier {

    function verifyProof(
        uint256[24] calldata _proof, 
        uint256[4] calldata _pubSignals
    ) public view returns (bool);

}
