# Ignition ZK Deployment Flow

## 1. Core Protocol Deployment

**Step 1: Deploy Base Infrastructure**
- Deploy all ZK Verifier contracts: MembershipVerifier, ProposalVerifier, VoteVerifier, ProposalClaimVerifier.
- Deploy the IgnitionZK NFT implementation contract (do not initialize).

**Step 2: Deploy Manager Contracts**
- Deploy manager modules with temporary ownership:
  - MembershipManager
  - ProposalManager
  - VoteManager
- Deploy GovernanceManager (central authority).

**Step 3: Establish Ownership Hierarchy**
- Transfer ownership of all managers to GovernanceManager:
  - MembershipManager → GovernanceManager
  - ProposalManager → GovernanceManager
  - VoteManager → GovernanceManager

---

## 2. Treasury System Deployment

**Step 4: Deploy Treasury Infrastructure**
- Deploy TreasuryManager implementation (do not initialize).
- Deploy BeaconManager with the TreasuryManager implementation address.
- Deploy TreasuryFactory with the BeaconManager address, owned by GovernanceManager.

**Step 5: Deploy Funding Modules**
- Deploy GrantModule (and any other funding modules).
- Set ownership to GovernanceManager.

---

## 3. System Configuration

**Step 6: Connect Components**
- Register TreasuryFactory in GovernanceManager via `setTreasuryFactory()`.
- Register funding modules in GovernanceManager via `addFundingModule()`.

**Step 7: Production Readiness**
- Transfer temporary ownership to permanent multisig wallets.
- Verify all contracts on a block explorer.

> **Note:** All deployments with "temporary ownership" should use the relayer during development or the IgnitionZK multisig for production.