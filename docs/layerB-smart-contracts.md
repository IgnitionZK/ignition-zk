## Layer B: On-Chain Infrastructure 

This layer provides the foundational smart contract architecture for Ignition ZK, ensuring upgradeability, modularity, and secure operation. 

The system is organized into several core contract groups:

- **Governance & Managers:** Upgradeable manager contracts (Membership, Proposal, Vote) coordinate DAO membership, proposal lifecycle, and voting, all governed by the central GovernanceManager.
- **Verifiers:** Immutable ZK-SNARK verifier contracts validate membership, proposal, and voting proofs, enabling privacy-preserving governance.
- **NFT Factory:** An efficient ERC721 clone factory deploys group NFTs for DAO membership gating.
- **Treasury System:** A modular, upgradeable treasury framework manages on-chain funds for each DAO. Treasury instances are deployed as beacon proxies, supporting flexible funding modules (e.g., grants, quadratic funding), role-based security and independent storage.

Together, these contracts enable secure, extensible, and privacy-preserving DAO operations, with seamless upgrade paths for both governance logic and treasury management.

### Key Features:

* **UUPS Upgradeability:** Core manager contracts (Membership, Proposal, Voting, GovernanceManager, and funding modules) are fully upgradeable via the UUPS (ERC-1967) proxy pattern.
* **Beacon Upgradeability:** Treasury contracts are upgradeable via the Beacon proxy pattern, allowing all treasury instances to be upgraded simultaneously through the BeaconManager.
* **NFT Clone Factory:** Utilizes lightweight minimal proxies, aka "clones" (EIP-1167), for efficient ERC721 contract deployment.
* **NFT-Gated Access:** Implements a robust ERC721-gated mechanism for controlling DAO membership.
* **Role-Based Security:** Granular, role-gated execution ensures secure control over critical membership, proposal, voting and treasury logic.
* **Extensible Treasury:** Supports dynamic plug-in funding modules for flexible treasury management, with all treasury instances upgradeable via a single beacon.

### Smart Contract Modules and Responsibilities

<div style="overflow-x: auto;">

| Smart Contract                                                                 | Category      | Type                        | Stores                                                                                 | Responsibilities                                                                                                         | Owner                        |
|--------------------------------------------------------------------------------|---------------|-----------------------------|----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|------------------------------|
| [MembershipManager](hardhat/contracts/managers/MembershipManager.sol)           | Manager       | UUPS (ERC-1967)             | Merkle roots                                                                           | - Deploy group NFTs<br>- Manage DAO members<br>- Verify DAO membership                                                   | GovernanceManager            |
| [ProposalManager](hardhat/contracts/managers/ProposalManager.sol)               | Manager       | UUPS (ERC-1967)             | Proposal submission nullifiers<br>Proposal claim nullifiers                            | - Verify proposal submissions<br>- Verify proposal claims                                                                 | GovernanceManager            |
| [VoteManager](hardhat/contracts/managers/VoteManager.sol)                       | Manager       | UUPS (ERC-1967)             | Vote nullifiers<br>Proposal results (tally, status, nullifier)<br>Quorum parameters<br>Group member count | - Verify vote validity<br>- Store and update proposal status                                                              | GovernanceManager            |
| [MembershipVerifier](hardhat/contracts/verifiers/MembershipVerifier.sol)        | Verifier      | Immutable                   | —                                                                                      | - Verify DAO membership claims (via MembershipManager)                                                                    | Unrestricted                 |
| [ProposalSubmissionVerifier](hardhat/contracts/verifiers/ProposalVerifier.sol)  | Verifier      | Immutable                   | —                                                                                      | - Verify proposal submission proofs (via ProposalManager)                                                                 | Unrestricted                 |
| [ProposalClaimVerifier](hardhat/contracts/verifiers/ProposalVerifier.sol)       | Verifier      | Immutable                   | —                                                                                      | - Verify proposal claim proofs (via ProposalManager)                                                                      | Unrestricted                 |
| [VoteVerifier](hardhat/contracts/verifiers/VoteVerifier.sol)                    | Verifier      | Immutable                   | —                                                                                      | - Verify voting proofs (via VoteManager)                                                                                  | Unrestricted                 |
| [ERC721IgnitionZK](hardhat/contracts/token/ERC721IgnitionZK.sol)                | NFT Factory   | Clone (EIP-1167)            | —                                                                                      | - Deploy NFT clones for DAOs                                                                                              | MembershipManager            |
| [GovernanceManager](hardhat/contracts/governance/GovernanceManager.sol)         | Governance    | UUPS (ERC-1967)             | Addresses of active funding modules                                                    | - Manage addresses of funding modules<br>- Delegate calls to managers via relayer                                         | IgnitionZK MultiSig          |
| [TreasuryManager](hardhat/contracts/treasury/TreasuryManager.sol)               | Treasury      | Beacon Proxy Instance       | Funding request records (per instance)                                                 | - Template for beacon proxy instance deployment<br>- Access-controlled, upgradeable treasury logic                        | DAO Treasury MultiSig (per instance) |
| [BeaconManager](hardhat/contracts/treasury/BeaconManager.sol)                   | Treasury      | Beacon (immutable)          | Implementation address                                                                 | - Holds implementation for TreasuryManager beacon proxies<br>- Owner can upgrade all treasuries                           | IgnitionZK MultiSig          |
| [TreasuryFactory](hardhat/contracts/treasury/TreasuryFactory.sol)               | Treasury      | Immutable                   | Beacon proxy addresses                                                                 | - Deploys beacon proxy instances                                                                                         | GovernanceManager            |
| [GrantModule](hardhat/contracts/fundingModules/GrantModule.sol)                 | Funding Module| UUPS (ERC-1967)             | —                                                                                      | - Initiates grant funding requests to treasury instances                                                                  | GovernanceManager            |
| Quadratic Funding Module                                                        | Funding Module| (Planned)                   | —                                                                                      | - (Planned) Quadratic funding logic                                                                                      | GovernanceManager            |

</details>

