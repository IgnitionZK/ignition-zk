//SPDX-License-Identifier: MIT
pragma solidity >=0.8.28 <0.9.0;

import { ITreasuryManager } from "../interfaces/treasury/ITreasuryManager.sol";

contract MockMaliciousFundRecipient {
    error SuccessfulReentrancy();
    event ReentrancyAttempt(bool success);

    ITreasuryManager public treasuryInstance;
    bool public entered;
    bytes32 contextKey;

    constructor(address _treasuryInstance, bytes32 _contextKey) {
        treasuryInstance = ITreasuryManager(_treasuryInstance);
        contextKey = _contextKey;
    }

    receive() external payable {
        if(!entered) {
            entered = true;
            (bool success, ) = address(treasuryInstance).call(
                abi.encodeWithSignature("executeTransfer(bytes32)", contextKey)
                );
            emit ReentrancyAttempt(success);
            if (success) revert SuccessfulReentrancy();
        }

    }
}