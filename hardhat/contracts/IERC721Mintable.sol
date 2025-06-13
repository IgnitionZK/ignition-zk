//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IERC721Mintable is IERC721 {
    function safeMint(address to, uint256 tokenId) external;
    function mint(address to, uint256 tokenId) external;
    function balanceOf(address owner) external view returns (uint256);
}