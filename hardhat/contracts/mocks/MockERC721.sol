// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

// OZ Imports:
import { ERC721Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import { ERC721BurnableUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import { ERC721EnumerableUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { ContextUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

// Interfaces:
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
* @title ERC721IgnitionZK
* @dev An ERC721 contract with additional functionalities for IgnitionZK.
* This contract allows for minting tokens and revoking membership by burning tokens.
* It restricts transfers and approvals to prevent unauthorized actions.
* The contract uses AccessControl for role management, allowing specific roles to mint and burn tokens.
* The contract is designed to be upgradeable and follows the OpenZeppelin standards.
*/
contract MockERC721 is Initializable, ContextUpgradeable, ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721BurnableUpgradeable, AccessControlUpgradeable {
    
    // Custom error for non-transferability
    error TransferNotAllowed();

    uint256 private _nextTokenId;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();               // protects the template itself
    }

    function initialize(
        address initialAdmin,
        address initialMinter,
        address initialBurner,
        string memory name_,
        string memory symbol_
    ) external initializer {
        __ERC721_init(name_, symbol_);
        __ERC721Enumerable_init();
        __ERC721Burnable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);

        _grantRole(MINTER_ROLE, initialMinter);
        _grantRole(MINTER_ROLE, initialAdmin);

        _grantRole(BURNER_ROLE, initialBurner);
        _grantRole(BURNER_ROLE, initialAdmin);
    }

    function safeMint(address to) external onlyRole(MINTER_ROLE) returns (uint256) {
        revert("mock minting failed");
    }

    // Function to burn a token, effectively revoking the membership associated with it.
    // This function can only be called by the owner of the contract (governor).
    function revokeMembershipToken(uint256 tokenId) external onlyRole(BURNER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "NFT: Token does not exist");
        _burn(tokenId);
    }

    // --- BLOCK APPROVALS -------------------------------------------------
    function approve(address to, uint256 tokenId)
        public
        pure
        override(IERC721, ERC721Upgradeable)
    {
        revert TransferNotAllowed();
    }

    function setApprovalForAll(address operator, bool approved)
        public
        pure
        override(IERC721, ERC721Upgradeable)
    {
        revert TransferNotAllowed();
    }

    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (address)
    {
        // --- BLOCK TRANSFERS -------------------------------------------------
        address from = _ownerOf(tokenId);

        // allow mint  (from == 0)  and burn  (to == 0)
        if (from != address(0) && to != address(0)) {
            revert TransferNotAllowed();
        }
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}