<p align="center">
  <img src="frontend/src/assets/logo-transparent-bg.png" alt="IgnitionZK Logo" width="120" style="margin-bottom: 1rem;" />
</p>

<h1 align="center" style="font-weight: 700; font-size: 3rem; font-family: 'Segoe UI', sans-serif; margin: 0;">
  IgnitionZK
</h1>

<h2 align="center" style="font-weight: 500; font-size: 1.75rem; letter-spacing: 0.05em; margin-top: 1rem;">
  ZK-Governed · Modular · Upgradeable Treasury
</h2>

<h3 align="center" style="font-weight: 400; font-size: 1.25rem; color: #666; margin-top: 0.5rem;">
  For High-Impact Closed-Group DAOs
</h3>

---


* [Introducing IgnitionZK](#introducing-ignitionzk)
* [IngitionZK Components](#ignitionzk-components)
    * [Layer A: ZK Engine](#layer-a-zk-engine)
        * [ZK Circuit Components](#zk-circuit-components)
        * [ZK Off-Chain Tooling](#zk-off-chain-tooling)
    * [Layer B: Core On-Chain Infrastructure](#layer-b-core-on-chain-infrastructure)
* [IgnitionZK Lifecycle](#ignitionzk-lifecycle)
    * [Phase 1: DAO Formation and Membership](#phase-1-dao-formation-and-membership)
        * [Step 1.1 DAO Initiation](#step-11-dao-initiation)
        * [Step 1.2 ERC721 Membership NFTs](#step-12-erc721-membership-nfts)
        * [Step 1.3 Member ZK Credential Generation](#step-13-member-zk-credential-generation)
        * [Step 1.4 Merkle Tree Creation](#step-14-merkle-tree-creation)
        * [Step 1.5 Member Verification](#step-14-member-verification)
    * [Phase 2: Anonymous Proposal Submissions](#phase-2-anonymous-proposal-submissions)
    * [Phase 3: Anonymous Voting](#phase-3-anonymous-voting)
    * [Phase 4: Proposal Execution](#phase-4-proposal-execution)

## Introducing IgnitionZK 

**IgnitionZK** is a fully modular, UUPS-upgradeable, ZK-native DAO framework tailored to small-to-medium closed-group DAOs. It enables:

* **Private operations:** Private identity, proposal submission and voting using Zero-Knowledge Proofs
* **Verifiable membership:** Publicly verifiable NFT-gated access ensuring only eligible members with real-world credentials can join.
* **Flexible member management:** Dynamic DAO member handling via NFT mint/burn
* **Flexible funds management:** Flexible treasury logic via pluggable funding modules
* **Streamlined creation:** Intuitive UI for DAO and ERC721 deployment.
* **Delegated control:** Granular role delegation via a Governance Manager.
* **Enhanced engagement:** Fostering high participation and accountability via smaller publicly-verified"expert" groups leading to higher individual stakes and more focused contributions.

## IgnitionZK Components

![IgnitionZK Summary](frontend/src/assets/topleveldiagram.png)


## Layer A: ZK Engine

This layer forms the cryptographic core of IgnitionZK, enabling privacy-preserving and verifiable interactions through Zero-Knowledge Proofs (ZKPs) and associated off-chain tooling. It's designed to ensure confidential operations while maintaining trustless integrity within the DAO.

### Key Features:
* **ZKP Protocol:** Leverages `circom` for off-chain proof generation using the `PLONK` ZKP Protocol, benefiting from a universal trusted setup.
* **On-Chain Verification:** Dedicated verifiers are deployed on-chain to efficiently check the validity of generated proofs.
* **Comprehensive Off-Chain Tooling:** Provides essential utilities for ZK identity management, Merkle root generation and storage, and the generation of ZKP circuit proofs.
* **Secure Identity Management:** ZK identities are managed via mnemonic seeds, HKDF, Poseidon hashing, and Merkle Trees, ensuring robust and private member authentication.

### ZK Circuit Components

The Circom circuits are the mathematical backbone of IgnitionZK's privacy logic. They empower DAO members to submit and vote on proposals confidentially, ensuring uniqueness and integrity through cryptographic commitments and nullifiers without revealing sensitive details.


<details>
<summary>
    <strong>ZK Circuit Components & Responsibilities</strong>
</summary>

| Circuit | Summary | Verification Context | Included | Input Signals | Public Output Signals | Circuit Constraints | On-Chain Constraints |
|---|---|---|---|---|---|---|---|
| [Membership](zk/circuits/membership/membership_circuit.circom) | Private verification of DAO membership via ZK credentials & Merkle proofs. | Per-DAO | | <ul><li>`root`<li>`group hash`<li>`identity trapdoor`<li>`identity nullifier`<li>`path elements`<li>`path indices`</ul> | <ul><li>`root`<li>`group hash`<li>`membership nullifier`</ul> | `isMember === 1` | Unique `membership nullifier` |
| [Proposal Submission](zk/circuits/proposal/proposal_circuit.circom) | Private submission of funding proposals from verified DAO members, with content validation & deduplication. | Per-DAO, Per-EPOCH | Membership Proof | <ul><li>Membership inputs<li>`proposal content hash`<li>`proposal title hash`<li>`proposal description hash`<li>`proposal payload hash`<li>`epoch hash`</ul> | <ul><li>`proposal context hash`<li>`proposal nullifier`<li>`root`<li>`proposal content hash`</ul> | `isMember === 1`<br>`Poseidon(title, desc, payload) === ContentHash` | Unique `proposal nullifier` |
| [Voting](zk/circuits/voting/voting_circuit.circom) | Confidential voting by verified DAO members, with content validation & deduplication. | Per-DAO, Per-EPOCH, Per-PROPOSAL | Membership Proof | <ul><li>Membership inputs</ul> | ... | ... | Unique `voting nullifier` |
</details>

### ZK Off-Chain Tooling

A dedicated set of off-chain scripts and utilities orchestrates the entire ZKP lifecycle. These tools facilitate the secure creation of ZK identities (generating identity trapdoors and nullifiers), the dynamic construction and storage of Merkle Trees, and the efficient generation of proofs for all integrated ZK circuits.

<details>
<summary>
    <strong>Core Script Modules & Responsibilities</strong>
</summary>

| Core Script | Class | Summary | Primitives Used | Key Methods |
|---|---|---|---|---|
| [generateCredentials.js](frontend/src/scripts/generateCredentials.js) | `ZkCredentials` | Manages ZK identity: seeds, keys, credentials. | <ul><li>Mnemonic Seeds<li>HKDF<li>Keccak256<li>Poseidon Hash</li></ul> | <ul><li>`generateMnemonicSeed`<li>`generateSeedFromMnemonic`<li>`generateKeys`<li>`generateIdentity`<li>`generateCredentials`</ul> |
| [merkleTreeService.js](frontend/src/scripts/merkleTreeService.js) | `MerkleTreeService` | Creates Merkle trees & generates proofs. | <ul><li>Merkle Trees<li>Poseidon Hash</li></ul> | <ul><li>`createMerkleTree`<li>`generateMerkleProof`</ul> |
| [generateZKProof.js](frontend/src/scripts/generateZKProof.js) | `ZKProofGenerator` | Generates ZK proofs for circuits. | <ul><li>ZKPs (PLONK)<li>Poseidon Hash<li>Merkle Trees<li>Calldata Encoding</li></ul> | <ul><li>`generateMembershipCircuitInput`<li>`generateProposalCircuitInput`<li>`generateProof`<li>`verifyProofOffChain`<li>`generateSolidityCalldata`</ul> |
</details>

## Layer B: Core On-Chain Infrastructure 

This layer provides the foundational smart contract architecture, ensuring the framework's upgradeability, modularity, and secure operation. Built upon OpenZeppelin's **UUPS (ERC-1967) proxy pattern**, it allows for seamless, future-proof enhancements without requiring redeployment.


### Key Features:

* **Upgradeability:** Core manager contracts (Membership, Proposal, Voting) are fully upgradeable via the Governance Manager.
* **NFT Clone Factory:** Utilizes lightweight minimal proxies, aka "clones" (EIP-1167), for efficient ERC721 contract deployment.
* **NFT-Gated Access:** Implements a robust ERC721-gated mechanism for controlling DAO membership.
* **Role-Based Security:** Granular, role-gated execution ensures secure control over critical membership, proposal, and voting logic.
* **Extensible Treasury:** Supports dynamic plug-in funding modules for flexible treasury management.


<details>
<summary>
    <strong>Smart Contract Modules and Responsibilities</strong>
</summary>

| Smart Contract | Function | Type | Stores | Responsibilities | Owner |
|---|---|---|---|---|---|
| [Membership Manager](hardhat/contracts/managers/MembershipManager.sol) | ZK Engine | UUPS ERC-1967 | <ul><li>Merkle roots</ul>| <ul><li>Deploy Group NFTs<li>Manage DAO members</ul> | Governance Mgr
| [Proposal Manager](hardhat/contracts/managers/ProposalManager.sol)  | ZK Engine | UUPS ERC-1967 | <ul><li>Proposal Nullifiers<li>Content Hash</ul> | <ul><li>Verify proposal submissions</ul> | Governance Mgr
| [Voting Manager](hardhat/contracts/managers/VotingManager.sol) | ZK Engine | UUPS ERC-1967 | <ul><li>Vote Nullifiers<li>Content Hash</ul> | <ul><li>Verify vote validity</ul> | Governance Mgr
| [Proposal Verifier](hardhat/contracts/verifiers/ProposalVerifier.sol) |  ZK Engine | Immutable | | <ul><li>Verify proposal proofs (via PM)</ul> | Unrestricted
| [Voting Verifier](hardhat/contracts/verifiers/VotingVerifier.sol) | ZK Engine | Immutable | | <ul><li>Verify voting proofs (via VM)</ul> | Unrestricted
| [ERC721IgnitionZK](hardhat/contracts/token/ERC721IgnitionZK.sol) | NFT Factory  | Clone EIP-1167 | | <ul><li>Deploy NFT Clones for DAOs</ul> | Membership Mgr
| [Governance Manager](hardhat/contracts/governance/GovernanceManager.sol)  | Governance | UUPS ERC-1967 |.. | <ul><li>Delegate calls to Managers</ul> | Multi-sig
| Treasury Manager | Treasury | ... | ... | ... | Governance Mgr
| Grant Module | Funding Module | ... | ... | ... | Governance Mgr
| Quadratic Funding Module | Funding Module | ... | ... | ... | Governance Mgr
</details>

---

# IgnitionZK Lifecycle
### Phase 1: DAO Formation and Membership

![DAO formation & membership](frontend/src/assets/Phase1.png)

#### Step 1.1 DAO Initiation

A DAO is initiated when a ERC721 contract with the DAO's name and token symbol is deployed. This is achieved through a minimal proxy EIP-1167  contract: a main, immutable ERC721 contract is deployed (implementation contract) which acts like a contract factory for all subsequent clones. 

<details>
<summary>
    <strong>Key Features</strong>
</summary>

Implementation Contract: [ERC721IgnitionZK](hardhat/contracts/token/ERC721IgnitionZK.sol)

* Using OpenZeppelin's AccessControl library for explicit role-based access for minting and burning tokens:
    * `default_admin_role`, `minter_role`, `burner_role`: granted to Membership Manager
    * gated access to role trasfers via delegated functions only callable by the Governance Manager
* ERC721 Token name and symbol defined by the user in the UI
</details>

<details>
<summary>
    <strong>Data Flow</strong>
</summary>

* User enters new DAO's data on the UI.
* Relayer calls `GovernanceManager.delegateDeployGroupNft`.
* `GovernanceManager` function calls `MembershipManager.deployGroupNft(bytes32 groupKey, string calldata name, string calldata symbol)`.
* New DAO NFT address is saved:
    * **Off-chain:** in `ignitionzk.groups`
    * **On-chain:** in `MembershipManager`'s `groupNftAddresses` mapping.
</details>

#### Step 1.2 ERC721 Membership NFTs

The appointed administrator of a new DAO group extends invitations to the initial cohort of members through the UI. This immediately prompts the minting of ERC721 membership NFTs from the DAO's dedicated contract. Each minted NFT serves as verifiable proof of their valid group membership.

<details>
<summary>
    <strong>Key Features</strong>
</summary>

* **Soulbound:** Membership NFTs are intentionally non-transferable, ensuring that DAO participation is exclusively tied to the individual's verified identity and eligibility within the real-world group.
* **Burnable:** When a member's affiliation with the real-world group ceases, their active DAO participation is terminated through the burning of their corresponding membership NFT.
</details>

<details>
<summary>
    <strong>Data Flow</strong>
</summary>

1. DAO Administrator enters members' addresses on the UI
2. Relayer calls `GovernanceManager.delegateMintNftToMember`
3. `GovernanceManager` function calls `MembershipManager.mintNftToMember`
4. The MembershipManager mints a new ERC721 membership NFT directly to each invited member's wallet.
5. These new DAO members are recorded via anonymized `group_member_id`s **off-chain** within ` ignitionzk.group_members`; there is **no on-chain storage** of individual member addresses or IDs.
</details>

#### Step 1.3 Member ZK Credential Generation

Only members actively holding one of the DAO's valid membership NFTs are eligible to proceed with generating their Zero-Knowledge credentials for private interactions within the DAO.

<details>
<summary>
    <strong>Methodology</strong>
</summary>

*Script: [generateCredentials.js](frontend/src/scripts/generateCredentials.js)*

The cryptographic steps involved in securely generating a unique Zero-Knowledge identity for each DAO member are as follows:
1. **Mnemonic phrase generation:** A random 12-word mnemonic phrase is generated from 128 bits of entropy, serving as the foundational secret.
2. **Seed derivation:** A cryptographic seed is securely derived from this mnemonic phrase.
3. **Identity key derivation:** Using HKDF (HMAC-based Key Derivation Function) with the mnemonic seed, the essential trapdoor and nullifier keys are deterministically derived.
4. **Final identity components:** The ultimate identity trapdoor and identity nullifier values are then computed via the SNARK-friendly Poseidon hash function.
5. **Identity commmitment:** The final public identity commitment is calculated as a Poseidon hash of these two private components: `commitment = Poseidon(trapdoor, nullifier)`
</details>

<details>
<summary>
    <strong>Data Flow</strong>
</summary>

1. An eligible DAO member logs into their personal dashboard.
2. The member searches for and selects the specific DAO for which they are eligible to generate ZK credentials.
3. The chosen DAO group is added to their personal dashboard, and the member is prompted to generate their credentials.
4. Upon clicking "Generate Credentials," the member is securely presented with their newly generated mnemonic phrase.
5. The member's newly formed identity commitment is then stored off-chain in `ignitionzk.merkle_tree_leaves` (this commitment later contributes to the Merkle tree root on-chain).
</details>

#### Step 1.4 Merkle Tree Creation 

Following the generation of a new member's identity commitment, the DAO's Merkle Tree is dynamically reconstructed, and a fresh, up-to-date Merkle root is computed. This ensures the on-chain representation of the DAO's membership is always current.

<details>
<summary>
    <strong>Methodology</strong>
</summary>

*Script: [merkleTreeService.js](frontend/src/scripts/merkleTreeService.js)*

1. **Tree Construction:** The Merkle Tree is built from the DAO group's identity commitments (leaves) using the @zk-kit/imt library.
2. **Fixed Depth:** The tree maintains a fixed depth of 10 levels to align with the Membership Circom circuit's depth. This corresponds to a maximum number of 1024 leaves.
3. **Hashing & Arity:** Leaves are hashed in pairs (arity = 2) using the SNARK-friendly Poseidon hash function.
4. **Padding:** A designated zero element fills any empty leaves, ensuring the entire tree is fully populated across all levels.
5.  **Root Storage:** The newly computed Merkle root is securely saved both off-chain and on-chain within the MembershipManager contract.
</details>

<details>
<summary>
    <strong>Data Flow</strong>
</summary>

1. **Off-Chain Trigger:** The re-construction of a DAO's Merkle Tree is initiated when a new identity commitment is inserted off-chain into `ignitionzk.merkle_tree_leaves`.
2. **Off-Chain Storage.** The updated Merkle Root is stored off-chain in `ignitionzk.merkle_tree_roots`.
3. **On-Chain root update:**
    * **Initial root:** If this is the first time the Merkle root is computed for the DAO, the Relayer calls `governanceManager.delegateInitRoot` which in turn calls `MembershipManager.initRoot`.
    * **Subsequent updates:** If a Merkle root for the DAO already exists, the Relayer calls `governanceManager.delegateSetRoot` which in turn calls `MembershipManager.setRoot`.
4. The new Merkle root is stored on-chain in the Membership Manager's `groupRoots` mapping.
</details>

#### Step 1.5 Member Verification

When a DAO member wants to perform an action, like submitting or voting on a proposal, they first need to prove they're an eligible member. This membership verification is a critical, integrated step within both the proposal submission and voting processes.

<details>
<summary>
    <strong>Methodology</strong>
</summary>

1. **Mnemonic input:** The user starts by securely entering their mnemonic phrase.
2. **ZK Credential Derivation:** From this mnemonic, we deterministically derive their identity trapdoor, a nullifier, and their final commitment. These are their essential ZK credentials.
3. **Merkle Tree Check:** We then check if the derived identity commitment exists as a leaf in the DAO's Merkle Tree. If it does, we pinpoint its exact position within the tree.
4. **Membership Proof Generation:** Using this known position, we generate a Merkle Proof of membership. This proof includes all the necessary sibling leaves (known as path elements) and their left/right positions (path indices) along the path from the user's leaf all the way up to the Merkle root.
5. **Proof Assembly:** The complete input for this Membership Proof consists of the identity trapdoor, identity nullifier, the expected Merkle root, the path elements, the path indices, and a DAO identifier to provide context.
6. **Validation by Membership Manager:** Finally, this assembled proof is sent to the Membership Manager. The manager then verifies the proof, confirming that the user is indeed a legitimate DAO member before allowing them to proceed with their action.

</details>

### **Phase 2:** Anonymous Proposal Submissions

#### Step 2.1 Campaign Creation 

![Campaign creation](frontend/src/assets/campaign_illustration.png)

#### Step 2.2 Proposal Submission

### **Phase 3:** Anonymous Voting
### **Phase 4:** Proposal Execution







