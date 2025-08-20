### Phase 4: Claiming Proposal Awards

After a proposal passes the voting phase, a review period begins. During this time, the original creator must submit an "ownership claim" to de-anonymize themselves in a verifiable manner. This claim uses a Zero-Knowledge Proof to prove they are the original creator without revealing any private information beyond what's necessary.


#### Step 4.1 Submitting the Ownership Claim

The creator generates a ZK-Proof using their original, private credentials (the same ones used to create the proposal). This proof is then submitted on-chain.

*   **Mechanism**

The ownership claim is verified through the Claim ZK-Circuit. This circuit ensures the integrity of the claim without revealing the user's private key.

The ZK Circuit guarantess that:

* **Credential Match**: The ZK-Proof confirms that the private credentials used to generate the claim match the credentials associated with the original proposal submission.
*   **Proposal Integrity**: The proof is cryptographically bound to the specific proposal being claimed, preventing a valid proof for one proposal from being used to claim another.

##### On-Chain Interaction Flow:

```
User (Proposal Creator) → Generate ZK-Proof → Relayer → GovernanceManager → ProposalManager → ProposalClaimVerifier → Update Proposal State
```

With ownership verifiably established, the proposal is now ready for the final phase: **Execution and Funding**.