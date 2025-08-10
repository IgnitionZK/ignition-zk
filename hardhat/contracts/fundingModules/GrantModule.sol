// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ERC165Upgradeable } from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";



contract GrantModule is UUPSUpgradeable, Initializable, OwnableUpgradeable {

    bytes32 private constant GRANT_TYPE = keccak256("grant");

    Itreasury private treasury;



    function initialize(
        address _owner,
        address _treasury
    ) 
        external 
        initializer 
        nonZeroAddress(_relayer)
        nonZeroAddress(_membershipManager)
        nonZeroAddress(_proposalManager)
        nonZeroAddress(_voteManager)
    {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        treasury = ITreasury(_treasury);

        emit TreasurySet(_treasury);
    }


    function distributeGrant(
        bytes32 contextKey,
        address to,
        uint256 amount
    ) external onlyOwner {
        
        treasury.requestTransfer(
            contextKey,
            to,
            amount,
            GRANT_TYPE
        )
    }

}
