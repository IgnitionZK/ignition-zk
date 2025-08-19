## Layer B: On-Chain Infrastructure 

This layer provides the foundational smart contract architecture, ensuring the framework's upgradeability, modularity, and secure operation. Built upon OpenZeppelin's **UUPS (ERC-1967) proxy pattern**, it allows for seamless, future-proof enhancements without requiring redeployment.


### Key Features:

* **Upgradeability:** Core manager contracts (Membership, Proposal, Voting) are fully upgradeable via the Governance Manager.
* **NFT Clone Factory:** Utilizes lightweight minimal proxies, aka "clones" (EIP-1167), for efficient ERC721 contract deployment.
* **NFT-Gated Access:** Implements a robust ERC721-gated mechanism for controlling DAO membership.
* **Role-Based Security:** Granular, role-gated execution ensures secure control over critical membership, proposal, and voting logic.
* **Extensible Treasury:** Supports dynamic plug-in funding modules for flexible treasury management.


### Smart Contract Modules and Responsibilities

<div style="overflow-x: auto;">

| Smart Contract | Function | Type | Stores | Responsibilities | Owner |
|---|---|---|---|---|---|
| [MembershipManager](hardhat/contracts/managers/MembershipManager.sol) | ZK Engine | UUPS ERC-1967 | <ul><li>Merkle roots</ul>| <ul><li>Deploy Group NFTs<li>Manage DAO members <li> Verify DAO membership </ul> | Governance Mgr
| [ProposalManager](hardhat/contracts/managers/ProposalManager.sol)  | ZK Engine | UUPS ERC-1967 | <ul><li>Proposal submission nullifiers <li> Proposal claim nullifiers</ul> | <ul><li>Verify proposal submissions <li>Verify proposal claims</ul> | Governance Mgr
| [VoteManager](hardhat/contracts/managers/VoteManager.sol) | ZK Engine | UUPS ERC-1967 | <ul><li>Vote Nullifiers<li>Proposal results: tally, passed status, proposal nullifier<li> quorum parameters <li> group member count and quorum </ul> | <ul><li>Verify vote validity <li> Store and update proposal status </ul> | Governance Mgr
| [MembershipVerifier](hardhat/contracts/verifiers/MembershipVerifier.sol) |  ZK Engine | Immutable | | <ul><li>Verify DAO membership claims (via MM)</ul> | Unrestricted
| [ProposalSubmissionVerifier](hardhat/contracts/verifiers/ProposalVerifier.sol) |  ZK Engine | Immutable | | <ul><li>Verify proposal submission proofs (via PM)</ul> | Unrestricted
| [ProposalClaimVerifier](hardhat/contracts/verifiers/ProposalVerifier.sol) |  ZK Engine | Immutable | | <ul><li>Verify proposal claim proofs (via PM)</ul> | Unrestricted
| [VoteVerifier](hardhat/contracts/verifiers/VoteVerifier.sol) | ZK Engine | Immutable | | <ul><li>Verify voting proofs (via VM)</ul> | Unrestricted
| [ERC721IgnitionZK](hardhat/contracts/token/ERC721IgnitionZK.sol) | NFT Factory  | Clone EIP-1167 | | <ul><li>Deploy NFT Clones for DAOs</ul> | Membership Mgr
| [GovernanceManager](hardhat/contracts/governance/GovernanceManager.sol)  | Governance | UUPS ERC-1967 | <ul><li>Addresses of active funding modules </ul> | <ul><li>Delegate calls to Managers via the relayer </ul> | IgnitionZK MultiSig
| [TreasuryManager](hardhat/contracts/treasury/TreasuryManager.sol) | Treasury | Immutable  | Beacon proxy instances store: <ul><li> funding request records </ul> | <ul><li>Template for beacon proxy instance deployment <li> Creates Access-Controled upgradeable proxies </ul> | <ul><li> TreasuryManager: not initialized on deployment <li> Beacon proxies: DAO Treasury MultiSig</ul>
| [BeaconManager](hardhat/contracts/treasury/BeaconManager.sol) | Treasury | Beacon (immutable) | Implementation address | <ul><li>Holds implementation for TreasuryManager BeaconProxies <li> Owner can update implementation (upgrades all treasuries) </ul> | IgnitionZK MultiSig
| [TreasuryFactory](hardhat/contracts/treasury/TreasuryFactory.sol) | Treasury | Immutable  | <ul><li> Beacon proxy addresses </ul> | <ul><li>Deploys beacon proxy instances </ul> | Governance Mgr
| [GrantModule](hardhat/contracts/fundingModules/GrantModule.sol) | Funding Module | UUPS ERC-1967 | | <ul><li> Initiates grant funding requests to the treasury instances</ul> | Governance Mgr
| Quadratic Funding Module | Funding Module | ... | ... | ... | Governance Mgr

</details>

