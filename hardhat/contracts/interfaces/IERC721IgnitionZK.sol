//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @title IERC721IgnitionZK
 * @dev Interface for an ERC721 contract with additional functionalities for IgnitionZK.
 */
interface IERC721IgnitionZK is IERC721, IERC721Enumerable, IAccessControl {
    function initialize(
        address admin,
        address minter,
        address burner,
        string memory name,
        string memory symbol
    ) external;
    
    function safeMint(address to) external returns (uint256);
    function revokeMembershipToken(uint256 tokenId) external;

    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function hasRole(bytes32 role, address account) external view returns (bool);

    function MINTER_ROLE() external view returns (bytes32);
    function BURNER_ROLE() external view returns (bytes32);
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
}