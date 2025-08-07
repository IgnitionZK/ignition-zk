
## Layer A: ZK Engine

This layer forms the cryptographic core of IgnitionZK, enabling privacy-preserving and verifiable interactions through Zero-Knowledge Proofs (ZKPs) and associated off-chain tooling. It's designed to ensure confidential operations while maintaining trustless integrity within the DAO.

### Key Features:
* **ZKP Protocol:** Leverages `circom` for off-chain proof generation using the `PLONK` ZKP Protocol, benefiting from a universal trusted setup.
* **On-Chain Verification:** Dedicated verifiers are deployed on-chain to efficiently check the validity of generated proofs.
* **Comprehensive Off-Chain Tooling:** Provides essential utilities for ZK identity management, Merkle root generation and storage, and the generation of ZKP circuit proofs.
* **Secure Identity Management:** ZK identities are managed via mnemonic seeds, HKDF, Poseidon hashing, and Merkle Trees, ensuring robust and private member authentication.

### ZK Circuit Components

The Circom circuits are the mathematical backbone of IgnitionZK's privacy logic. They empower DAO members to submit and vote on proposals confidentially, ensuring uniqueness and integrity through cryptographic commitments and nullifiers without revealing sensitive details.

**ZK Circuit Documentation**:  
[Membership](./zk/circuits/membership/docs-membership_circuit.md) |
[Proposal](./zk/circuits/proposal/docs-proposal_circuit.md) |
[Vote](./zk/circuits/vote/docs-vote_circuit.md) |
[Claim](./zk/circuits/proposal-claim/docs-proposal_claim_circuit.md)

### ZK Circuit Components & Responsibilities

<div style="overflow-x: auto;">

| Circuit | Summary | Verification Context | Included | Input Signals | Public Output Signals | Circuit Constraints | On-Chain Constraints |
|---|---|---|---|---|---|---|---|
| [Membership](zk/circuits/membership/membership_circuit.circom) | Private verification of DAO membership via ZK credentials & Merkle proofs. | Per-DAO | | <ul><li>`root`<li>`group hash`<li>`identity trapdoor`<li>`identity nullifier`<li>`path elements`<li>`path indices`</ul> | <ul><li>`root`<li>`group hash`<li>`membership nullifier`</ul> | `isMember === 1` | Unique `membership nullifier` |
| [Proposal Submission](zk/circuits/proposal/proposal_circuit.circom) | Private submission of funding proposals from verified DAO members, with content validation & deduplication. | Per-DAO, Per-EPOCH | Membership Proof | <ul><li>Membership inputs<li>`proposal content hash`<li>`proposal title hash`<li>`proposal description hash`<li>`proposal payload hash`<li>`proposal metadata hash`<li> `proposal funding hash` <li>`epoch hash`</ul> | <ul><li>`proposal context hash`<li>`proposal submission nullifier` <li>`proposal claim nullifier`<li>`root`<li>`proposal content hash`</ul> | `isMember === 1`<br>`Poseidon(title, desc, payload) === ContentHash` | Unique `proposal submission nullifier` |
| [Vote](zk/circuits/vote/vote_circuit.circom) | Confidential voting by verified DAO members, with content validation, submisison nullifier and vote uniqueness verification. | Per-DAO, Per-EPOCH, Per-PROPOSAL | Membership Proof | <ul><li>Membership inputs <li> `vote choice` <li> `epoch hash` <li> `proposal hash`<li> `proposal submission nullifier` <li>`proposal title hash`<li>`proposal description hash`<li>`proposal payload hash`<li>`proposal metadata hash`<li> `proposal funding hash`</ul> | <ul><li> `vote context hash` <li> `vote nullifier` <li> `onchain verifiable vote choice hash` <li> `root` <li> `submission nullifier`</ul> | `isValidVoteChoice === 1` &`computedProposalSubmissionNullifier === proposalSubmissionNullifier` | Unique `vote nullifier` |
| [Proposal Claim](zk/circuits/proposal-claim/proposal_claim_circuit.circom) | Confidential verification that a reward claim for an accepted proposal is made by its original anonymous creator. | Per-PROPOSAL, Per-Submitter | Membership Proof | <ul><li>Membership inputs <li>`proposal submisison nullifer` <li>`proposal claim nullifier` <li>`proposal context hash` <li>`identity nullifier` </ul> | <li>`proposal submisison nullifer` <li>`proposal claim nullifier` <li>`proposal context hash` | `computedClaimNullifier === proposalClaimNullifier` | Unique `claim nullifier` |
</div>

### ZK Off-Chain Tooling

A dedicated set of off-chain scripts and utilities orchestrates the entire ZKP lifecycle. These tools facilitate the secure creation of ZK identities (generating identity trapdoors and nullifiers), the dynamic construction and storage of Merkle Trees, and the efficient generation of proofs for all integrated ZK circuits.

### Core Script Modules & Responsibilities

<div style="overflow-x: auto;">

| Core Script | Class | Summary | Primitives Used | Key Methods |
|---|---|---|---|---|
| [generateCredentials.js](frontend/src/scripts/generateCredentials.js) | `ZkCredentials` | Manages ZK identity: seeds, keys, credentials. | <ul><li>Mnemonic Seeds<li>HKDF<li>Keccak256<li>Poseidon Hash</li></ul> | <ul><li>`generateMnemonicSeed`<li>`generateSeedFromMnemonic`<li>`generateKeys`<li>`generateIdentity`<li>`generateCredentials`</ul> |
| [merkleTreeService.js](frontend/src/scripts/merkleTreeService.js) | `MerkleTreeService` | Creates Merkle trees & generates proofs. | <ul><li>Merkle Trees<li>Poseidon Hash</li></ul> | <ul><li>`createMerkleTree`<li>`generateMerkleProof`</ul> |
| [generateZKProof.js](frontend/src/scripts/generateZKProof.js) | `ZKProofGenerator` | Generates ZK proofs for circuits. | <ul><li>ZKPs (PLONK)<li>Poseidon Hash<li>Merkle Trees<li>Calldata Encoding</li></ul> | <ul><li>`generateMembershipCircuitInput`<li>`generateProposalCircuitInput`<li>`generateProof`<li>`verifyProofOffChain`<li>`generateSolidityCalldata`</ul> |
</div>
