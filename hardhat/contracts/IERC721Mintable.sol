//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC721Mintable {
    /**
     * @notice Safely mints a new NFT to the specified address.
     * @param to The address to mint the NFT to.
     * @param tokenId The unique identifier for the NFT.
     */
    function safeMint(address to, uint256 tokenId) external;
    function balanceOf(address owner) external view returns (uint256);
}