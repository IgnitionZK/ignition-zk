
### Phase 1: DAO Formation and Membership
#### Step 1.1 DAO Initiation

A DAO is initiated when a ERC721 contract with the DAO's name and token symbol is deployed. This is achieved through a minimal proxy EIP-1167  contract: a main, immutable ERC721 contract is deployed (implementation contract) which acts like a contract factory for all subsequent clones. 

![DAO formation & membership](../frontend/src/assets/dao-creation.png)

#### Key Features

Implementation Contract: [ERC721IgnitionZK](hardhat/contracts/token/ERC721IgnitionZK.sol)

* Using OpenZeppelin's AccessControl library for explicit role-based access for minting and burning tokens:
    * `default_admin_role`, `minter_role`, `burner_role`: granted to Membership Manager
    * gated access to role trasfers via delegated functions only callable by the Governance Manager
* ERC721 Token name and symbol defined by the user in the UI

#### Step 1.2 ERC721 Membership NFTs

The appointed administrator of a new DAO group extends invitations to the initial cohort of members through the UI. This immediately prompts the minting of ERC721 membership NFTs from the DAO's dedicated contract. Each minted NFT serves as verifiable proof of their valid group membership.

#### Key Features

* **Soulbound:** Membership NFTs are intentionally non-transferable, ensuring that DAO participation is exclusively tied to the individual's verified identity and eligibility within the real-world group.
* **Burnable:** When a member's affiliation with the real-world group ceases, their active DAO participation is terminated through the burning of their corresponding membership NFT.

#### Step 1.3 Member ZK Credential Generation

Only members actively holding one of the DAO's valid membership NFTs are eligible to proceed with generating their Zero-Knowledge credentials for private interactions within the DAO.

![ZK credential generation](../frontend/src/assets/zk-credentials.png)

#### Methodology

*Script: [generateCredentials.js](frontend/src/scripts/generateCredentials.js)*

The cryptographic steps involved in securely generating a unique Zero-Knowledge identity for each DAO member are as follows:
1. **Mnemonic phrase generation:** A random 12-word mnemonic phrase is generated from 128 bits of entropy, serving as the foundational secret.
2. **Seed derivation:** A cryptographic seed is securely derived from this mnemonic phrase.
3. **Identity key derivation:** Using HKDF (HMAC-based Key Derivation Function) with the mnemonic seed, the essential trapdoor and nullifier keys are deterministically derived.
4. **Final identity components:** The ultimate identity trapdoor and identity nullifier values are then computed via the SNARK-friendly Poseidon hash function.
5. **Identity commmitment:** The final public identity commitment is calculated as a Poseidon hash of these two private components: `commitment = Poseidon(trapdoor, nullifier)`

#### Step 1.4 Merkle Tree Creation 

Following the generation of a new member's identity commitment, the DAO's Merkle Tree is dynamically reconstructed, and a fresh, up-to-date Merkle root is computed. This ensures the on-chain representation of the DAO's membership is always current.

#### Methodology

*Script: [merkleTreeService.js](frontend/src/scripts/merkleTreeService.js)*

1. **Tree Construction:** The Merkle Tree is built from the DAO group's identity commitments (leaves) using the @zk-kit/imt library.
2. **Fixed Depth:** The tree maintains a fixed depth of 10 levels to align with the Membership Circom circuit's depth. This corresponds to a maximum number of 1024 leaves.
3. **Hashing & Arity:** Leaves are hashed in pairs (arity = 2) using the SNARK-friendly Poseidon hash function.
4. **Padding:** A designated zero element fills any empty leaves, ensuring the entire tree is fully populated across all levels.
5.  **Root Storage:** The newly computed Merkle root is securely saved both off-chain and on-chain within the MembershipManager contract.

#### Step 1.5 Member Verification

When a DAO member wants to perform an action, like submitting or voting on a proposal, they first need to prove they're an eligible member. This membership verification is a critical, integrated step within both the proposal submission and voting processes.

![Member verification](../frontend/src/assets/member-verification.png)

#### Methodology

1. **Mnemonic input:** The user starts by securely entering their mnemonic phrase.
2. **ZK Credential Derivation:** From this mnemonic, we deterministically derive their identity trapdoor, a nullifier, and their final commitment. These are their essential ZK credentials.
3. **Merkle Tree Check:** We then check if the derived identity commitment exists as a leaf in the DAO's Merkle Tree. If it does, we pinpoint its exact position within the tree.
4. **Membership Proof Generation:** Using this known position, we generate a Merkle Proof of membership. This proof includes all the necessary sibling leaves (known as path elements) and their left/right positions (path indices) along the path from the user's leaf all the way up to the Merkle root.
5. **Proof Assembly:** The complete input for this Membership Proof consists of the identity trapdoor, identity nullifier, the expected Merkle root, the path elements, the path indices, and a DAO identifier to provide context.
6. **Validation by Membership Manager:** Finally, this assembled proof is sent to the Membership Manager. The manager then verifies the proof, confirming that the user is indeed a legitimate DAO member before allowing them to proceed with their action.

