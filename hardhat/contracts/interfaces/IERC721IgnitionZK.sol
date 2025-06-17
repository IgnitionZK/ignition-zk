//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

/**
 * @title IERC721IgnitionZK
 * @dev Interface for an ERC721 contract with additional functionalities for IgnitionZK.
 */
interface IERC721IgnitionZK is IERC721, IERC721Enumerable {
    function safeMint(address to) external returns (uint256);
    function revokeMembershipToken(uint256 tokenId) external;
}