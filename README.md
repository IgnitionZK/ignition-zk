<p align="center">
![IgnitionZK logo](![ZK-Powered Product DAO Logo](https://raw.githubusercontent.com/IgnitionZK/ignition-zk/frontend/src/assets/logo.png))
</p>

### A ZKP-governed, modular and upgradeable treasury for high-impact closed-group DAOs

<p align="center">
![IgnitionZK Topline Graph](![IgnitionZK Topline Graph](https://raw.githubusercontent.com/IgnitionZK/ignition-zk/frontend/src/assets/topline.pdf))
</p>



| Smart Contract | Function | Type | Stores | Responsibilities | Owner |
|---|---|---|---|---|---|
| Membership Manager | ![Membership Manager Function Badge](https://img.shields.io/badge/ZK_Engine-blue?style=flat-square) | ![Membership Manager Type Badge](https://img.shields.io/badge/UUPS-EIP--1822-yellow?style=flat-square) | <ul> <li> Merkle roots </ul>| <ul> <li> Deploys group NFTs <li> Adds or removes DAO members via NFT-Gating </ul> | Governance Manager ![Membership Manager Owner Badge](https://img.shields.io/badge/OZ_Ownable-gray?style=flat-square) 
| Proposal Manager | ![Proposal Manager Function Badge](https://img.shields.io/badge/ZK_Engine-blue?style=flat-square) | ![Proposal Manager Type Badge](https://img.shields.io/badge/UUPS-EIP--1822-yellow?style=flat-square) | <ul><li> Proposal Nullifiers <li> Proposal Content Hash</ul> | <ul><li> Verifies validity of proposal submissions </ul> | Governance Manager ![Proposal Manager Owner Badge](https://img.shields.io/badge/OZ_Ownable-gray?style=flat-square) 
| Voting Manager | ![Voting Manager Function Badge](https://img.shields.io/badge/ZK_Engine-blue?style=flat-square) | ![Voting Manager Type Badge](https://img.shields.io/badge/UUPS-EIP--1822-yellow?style=flat-square) | <ul><li> Vote Nullifiers <li> Vote Content Hash</ul> | <ul><li></ul> | Governance Manager ![Voting Manager Owner Badge](https://img.shields.io/badge/OZ_Ownable-gray?style=flat-square)  
| Proposal Verifier |  ![Proposal Verifier Function Badge](https://img.shields.io/badge/ZK_Engine-blue?style=flat-square) | ![Proposal  Verifier Type Badge](https://img.shields.io/badge/Immutable-gray?style=flat-square) | | <ul><li>Verifies proposal submission proofs when called by Proposal Manager </ul> | ![Proposal Verifier Owner Badge](https://img.shields.io/badge/Unrestricted-gray?style=flat-square) 
| Voting Verifier | ![Voting Verifier Function Badge](https://img.shields.io/badge/ZK_Engine-blue?style=flat-square) | ![Voting  Verifier Type Badge](https://img.shields.io/badge/Immutable-gray?style=flat-square) | | <ul><li>Verifies voting proofs when called by Voting Manager </ul> | ![Voting Verifier Owner Badge](https://img.shields.io/badge/Unrestricted-gray?style=flat-square) 
| ERC721IgnitionZK | ![ERC721IgnitionZK Verifier Function Badge](https://img.shields.io/badge/NFT_Factory-yekkiw?style=flat-square)  | ![ERC721IgnitionZK Type Badge](https://img.shields.io/badge/Clone-EIP--1167-blue?style=flat-square) | | <ul><li>Deploys NFT Clones for new DAOs</ul> | Membership Manager ![ERC721IgnitionZK Owner Badge](https://img.shields.io/badge/OZ_AccessControl-gray?style=flat-square) 
| Governance Manager | ![Governance Manager Function Badge](https://img.shields.io/badge/Governance-purple?style=flat-square) | ![Governance Manager Type Badge](https://img.shields.io/badge/UUPS-EIP--1822-yellow?style=flat-square) |.. | <ul><li>Delegates calls to other Managers </ul> | Multi-sig ![Governance Manager Owner Badge](https://img.shields.io/badge/OZ_Ownable-gray?style=flat-square) 
| Treasury Manager | ![Treasury Manager Function Badge](https://img.shields.io/badge/Treasury-orange?style=flat-square) | ... | ... | ... | Governance Manager ![Treasury Manager Owner Badge](https://img.shields.io/badge/OZ_Ownable-gray?style=flat-square) 
| Grant Module | ![Grant Module Function Badge](https://img.shields.io/badge/Funding_Module-gray?style=flat-square) | ... | ... | ... | Governance Manager ![Treasury Manager Owner Badge](https://img.shields.io/badge/OZ_Ownable-gray?style=flat-square) 
| Quadratic Funding Module | ![Quadratic Funding Module Function Badge](https://img.shields.io/badge/Funding_Module-gray?style=flat-square) | ... | ... | ... | Governance Manager ![Treasury Manager Owner Badge](https://img.shields.io/badge/OZ_Ownable-gray?style=flat-square) 
.. | .. | ..| .. | .. | ..



Circuit | Goal | Context | Included circuit | Input Signals | Public Output Signals | Circuit Constraints | On-Chain Constraints 
|---|---|---|---|---|---|---|---|
| Membership  | Enables private verification of DAO membership through ZK credentials and Merkle proofs. |![DAO Group Badge](https://img.shields.io/badge/per-DAO-blue?style=flat-square) | | <ul><li>```root``` <li>```group hash``` <li>```identity trapdoor``` <li> ```identity nullifier``` <li> ```path elements``` array <li> ```path indices``` array </ul>  | <ul><li>```root``` <li> ```group hash``` <li> ```membership nullifier``` </ul> | ``` isMember === 1```| unused ```membership nullifier``` |
| Proposal Submission | Enables private submission of funding proposals from verified DAO members, incorporating content validation and deduplication. | ![DAO Group Badge](https://img.shields.io/badge/per-DAO-blue?style=flat-square) ![Epoch Badge](https://img.shields.io/badge/per-EPOCH-yellow?style=flat-square) | ![MembershipProof Badge](https://img.shields.io/badge/MEMBERSHIP-red?style=flat-square) | <ul> <li> input signals from ![MembershipProof Badge](https://img.shields.io/badge/MEMBERSHIP-red?style=flat-square) <li> ```proposal content hash``` <li> ```proposal title hash``` <li> ```proposal description hash``` <li> ```proposal payload hash``` <li> ```epoch hash```</ul> | <ul><li>```proposal context hash```  <li> ```proposal nullifier``` <li> ```root``` <li> ```proposal content hash``` </ul>  | ``` isMember === 1``` ```Poseidon(title, description, paylod) === ProposalContentHash```  | unused ```proposal nullifier``` |
Voting | Enables confidential voting by verified DAO members, with built-in vote content validation and deduplication.  |![DAO Group Badge](https://img.shields.io/badge/per-DAO-blue?style=flat-square) ![Epoch Badge](https://img.shields.io/badge/per-EPOCH-yellow?style=flat-square) ![Proposal Badge](https://img.shields.io/badge/per-PROPOSAL-purple?style=flat-square) |![MembershipProof Badge](https://img.shields.io/badge/MEMBERSHIP-red?style=flat-square) | <ul> <li> input signals from ![MembershipProof Badge](https://img.shields.io/badge/MEMBERSHIP-red?style=flat-square) </ul> | ... | ... | unused ```voting nullifier``` |


