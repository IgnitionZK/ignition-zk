
### Phase 1: DAO Formation and Membership
#### Step 1.1 DAO Initiation

A DAO begins when an ERC721 contract is deployed with the group’s chosen name and symbol. This uses a minimal proxy (EIP-1167) pattern, where a main ERC721 implementation contract acts as a factory for all future clones.

![DAO formation & membership](../frontend/src/assets/dao-creation.png)

The contract uses OpenZeppelin's AccessControl to manage roles. The Membership Manager is given admin, minter, and burner roles, and only the Governance Manager can transfer roles or perform sensitive actions. Token names and symbols are set by users in the UI.

#### Step 1.2 ERC721 Membership NFTs

The DAO administrator invites the initial cohort of members through the UI, triggering the minting of ERC721 membership NFTs from the DAO's dedicated contract. Each NFT serves as verifiable proof of valid group membership.

The DAO admin invites the first members through the UI, which triggers minting of ERC721 membership NFTs. Each NFT is proof of valid group membership.

Membership NFTs can’t be transferred, so participation is always tied to a real person. If a member leaves, their NFT is burned and they lose access. Minting and burning are handled on-chain by the MembershipManager, under the GovernanceManager’s authority.

#### Step 1.3 Member ZK Credential Generation

Only members with a valid NFT can generate their zero-knowledge credentials for private DAO actions.

![ZK credential generation](../frontend/src/assets/zk-credentials.png)

*Script: [generateCredentials.js](frontend/src/scripts/generateCredentials.js)*

The steps involved in securely generating a unique Zero-Knowledge identity for each DAO member are as follows:
1. A random 12-word mnemonic phrase is generated from 128 bits of entropy, serving as the foundational secret.
2. A cryptographic seed is securely derived from this mnemonic phrase.
3. Using HKDF (HMAC-based Key Derivation Function) with the mnemonic seed, the essential trapdoor and nullifier keys are deterministically derived.
4. The ultimate identity trapdoor and identity nullifier values are then computed via the SNARK-friendly Poseidon hash function.
5. The final public identity commitment is calculated as a Poseidon hash of these two private components: `commitment = Poseidon(trapdoor, nullifier)`

#### Step 1.4 Merkle Tree Creation 

After a new identity commitment is generated, the DAO’s Merkle Tree is updated and a new root is computed. This keeps the on-chain record of membership up to date.

*Script: [merkleTreeService.js](frontend/src/scripts/merkleTreeService.js)*

Merkle Tree Creation:
1. The Merkle Tree is built from the DAO group's identity commitments (leaves) using the @zk-kit/imt library.
2. The tree maintains a fixed depth of 10 levels to align with the Membership Circom circuit's depth. This corresponds to a maximum number of 1024 leaves.
3. Leaves are hashed in pairs (arity = 2) using the SNARK-friendly Poseidon hash function.
4. A designated zero element fills any empty leaves, ensuring the entire tree is fully populated across all levels.
5. The newly computed Merkle root is securely saved both off-chain and on-chain within the MembershipManager contract.

#### Step 1.5 Member Verification

When a member wants to submit or vote on a proposal, they first need to prove they’re eligible. This is done using the membership circuit (`membership_circuit.circom`) and a zero-knowledge proof.

![Member verification](../frontend/src/assets/member-verification.png)

Verification Flow:
1. The user enters their mnemonic phrase.
2. From this mnemonic, we deterministically derive their identity trapdoor, a nullifier, and their final ZK commitment.
3. We then check if the derived identity commitment exists as a leaf in the DAO's Merkle Tree. If it does, we pinpoint its exact position within the tree.
4. Using this known position, we generate a Merkle Proof of membership. This proof includes all the necessary sibling leaves (known as path elements) and their left/right positions (path indices) along the path from the user's leaf all the way up to the Merkle root.
5. The complete input for this Membership Proof consists of the identity trapdoor, identity nullifier, the expected Merkle root, the path elements, the path indices, and a DAO identifier to provide context.
6. *The proof is submitted to the `MembershipManager` via a delegated function from the `GovernanceManager` (e.g., `delegateVerifyMembership`). The contract verifies the proof using the on-chain Merkle root and the `MembershipVerifier`.

---

**References:**
- [`MembershipManager.sol`](../hardhat/contracts/managers/MembershipManager.sol)
- [`membership_circuit_instance.circom`](../zk/circuits/membership/membership_circuit_instance.circom)
- [`GovernanceManager.sol`](../hardhat/contracts/governance/GovernanceManager.sol)
- [`frontend/src/scripts/merkleTreeService.js`](../frontend/src/scripts/merkleTreeService.js)
- [`frontend/src/scripts/generateCredentials.js`](../frontend/src/scripts/generateCredentials-browser-safe.js)
- [`frontend/src/scripts/generateZKProof.js`](../frontend/src/scripts/generateZKProof.js)