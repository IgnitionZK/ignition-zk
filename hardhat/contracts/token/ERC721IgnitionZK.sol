// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
* @title ERC721IgnitionZK
* @dev An ERC721 contract with additional functionalities for IgnitionZK.
* This contract allows for minting tokens and revoking membership by burning tokens.
* It is owned by a governor who can manage the membership tokens.
*/
contract ERC721IgnitionZK is ERC721, ERC721Enumerable, ERC721Burnable, Ownable {
    uint256 private _nextTokenId;

    constructor(address initialOwner, string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        Ownable(initialOwner)
    {}

    function safeMint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    // Function to burn a token, effectively revoking the membership associated with it.
    // This function can only be called by the owner of the contract (governor).
    function revokeMembershipToken(uint256 tokenId) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "NFT: Token does not exist");
        _burn(tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}