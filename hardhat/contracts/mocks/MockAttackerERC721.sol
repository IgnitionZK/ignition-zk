//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../managers/MembershipManager.sol";
import { IMembershipManager } from "../interfaces/IMembershipManager.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockAttackerERC721 is ERC721 {

    event AttackSuccessful(address indexed memberAddress, bytes32 groupKey);

    IMembershipManager public membershipManager;
    bytes32 public groupKey;
    bool hasReentered;

    constructor(address _membershipManager, bytes32 _groupKey) ERC721("AttackerNFT", "ATK"){
        membershipManager = IMembershipManager(_membershipManager);
        groupKey = _groupKey;
    }

    function safeMint(address to) external returns (uint256 _tokenId) {
        uint256 tokenId = 1;
        _mint(to, tokenId);

        if (!hasReentered) {
            hasReentered = true;
            membershipManager.mintNftToMember(to, groupKey);
            emit AttackSuccessful(to, groupKey);
        }

        return tokenId;
    }
}