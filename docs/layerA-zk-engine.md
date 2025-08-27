
## Layer A: ZK Engine

This layer forms the cryptographic core of IgnitionZK, enabling privacy-preserving and verifiable interactions through Zero-Knowledge Proofs (ZKPs) and associated off-chain tooling. It's designed to ensure confidential operations while maintaining trustless integrity within the DAO.

### Key Features:
- **PLONK-Based ZKP Protocol:**  
  IgnitionZK uses `circom` and the PLONK protocol for efficient, universal-trusted-setup ZK proof generation.
- **On-Chain Verifiers:**  
  Each ZK circuit has a dedicated verifier contract deployed on-chain, ensuring that only valid proofs are accepted by the DAO’s smart contracts.
- **Off-Chain Tooling:** 
  Scripts and utilities handle ZK identity creation, Merkle tree management, and proof generation, making it easy for members to interact privately with the DAO.
- **Secure Identity Management:**  
  Members’ ZK identities are derived from mnemonic seeds, using HKDF and Poseidon hashing, and are organized in Merkle trees for efficient membership verification.

### ZK Circuits

The Circom circuits are the mathematical backbone of IgnitionZK's privacy logic. They empower DAO members to submit and vote on proposals confidentially, ensuring uniqueness and integrity through cryptographic commitments and nullifiers without revealing sensitive details.

**Documentation**:  
[Membership](./zk/circuits/membership/docs-membership_circuit.md) |
[Proposal](./zk/circuits/proposal/docs-proposal_circuit.md) |
[Vote](./zk/circuits/vote/docs-vote_circuit.md) |
[Claim](./zk/circuits/proposal-claim/docs-proposal_claim_circuit.md)

### Circuit Overview

<div style="overflow-x: auto;">

| Circuit | Purpose | Verification Context | Key Inputs | Public Outputs | Main Constraints | On-Chain Check |
|---|---|---|---|---|---|---|
| [Membership](zk/circuits/membership/membership_circuit.circom) | Prove DAO membership using ZK credentials and Merkle proofs | Per-DAO | Merkle root, group hash, identity keys, Merkle path | Merkle root, group hash, membership nullifier | Must be a valid member; unique nullifier | Membership nullifier not reused |
| [Proposal Submission](zk/circuits/proposal/proposal_circuit.circom) | Submit proposals privately, ensuring uniqueness and content integrity | Per-DAO, Per-Epoch | Membership proof, proposal content hashes, epoch hash | Proposal context hash, submission & claim nullifiers, Merkle root | Valid member, content hash matches, unique submission | Submission nullifier not reused |
| [Vote](zk/circuits/vote/vote_circuit.circom) | Cast votes anonymously, ensuring one vote per member per proposal | Per-DAO, Per-Epoch, Per-Proposal | Membership proof, vote choice, proposal hashes | Vote context hash, vote nullifier, choice hash, Merkle root | Valid vote, correct proposal, unique vote | Vote nullifier not reused |
| [Proposal Claim](zk/circuits/proposal-claim/proposal_claim_circuit.circom) | Prove ownership of a passed proposal to claim rewards | Per-Proposal, Per-Submitter | Membership proof, proposal nullifiers, context hash | Submission & claim nullifiers, context hash | Claim nullifier matches, unique claim | Claim nullifier not reused |
</div>

### Off-Chain ZK Tooling

A set of off-chain scripts supports the ZK lifecycle. These tools help members generate their ZK identities, build and update Merkle trees, and create proofs for all supported circuits. This off-chain layer is essential for keeping sensitive operations private and efficient.

### Core Script Modules 

<div style="overflow-x: auto;">

| Script | Class | What It Does | Key Primitives | Main Methods |
|---|---|---|---|---|
| [generateCredentials.js](frontend/src/scripts/generateCredentials.js) | `ZkCredentials` | Handles ZK identity creation: seeds, keys, credentials | Mnemonic seeds, HKDF, Keccak256, Poseidon | `generateMnemonicSeed`, `generateSeedFromMnemonic`, `generateKeys`, `generateIdentity`, `generateCredentials` |
| [merkleTreeService.js](frontend/src/scripts/merkleTreeService.js) | `MerkleTreeService` | Builds Merkle trees and generates proofs | Merkle trees, Poseidon hash | `createMerkleTree`, `generateMerkleProof` |
| [generateZKProof.js](frontend/src/scripts/generateZKProof.js) | `ZKProofGenerator` | Generates ZK proofs for all circuits | PLONK, Poseidon, Merkle trees, calldata encoding | `generateMembershipCircuitInput`, `generateProposalCircuitInput`, `generateProof`, `verifyProofOffChain`, `generateSolidityCalldata` |
</div>