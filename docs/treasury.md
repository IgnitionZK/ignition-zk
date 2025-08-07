
IgnitionZK MultiSig
owns
→
GovernanceManager 

GovernanceManager functions: 
A) onlyOwner (MultiSig) for system critical actions (upgrades, setting Verifiers, setting global quorum thresholds)
B) onlyRelayer for all others

-----

DAO Treasury clone with AccessControl:
Roles: 
- DAO MultiSig (DEFAULT_ADMIN_ROLE)
- Funding Modules (FUNDING_MODULE_ROLE)
- GM (GOVERNANCE_MANAGER_ROLE)

Treasury clone functions:
A) modifier onlyRole(FUNDING_MODULE_ROLE) for requestTransfer: funding module requests fund transfer to recipient for X amount
B) modifier onlyRole(DEFAULT_ADMIN_ROLE), ie MultiSig, for approveTransfer: multi sig approves and transfers the funds to recipient
C) modifier onlyRole(GOVERNANCE_MANAGER_ROLE) or onlyRole(DEFAULT_ADMIN_ROLE) to view treasury balance

-----

Proposal Execution / Fund Disbursement Flow:

Proposal for grant accepted 
→ 
Proposal creator clicks Claim button
→
If ZK claim proof accepted
→
relayer calls GovernanceManager.delegateDistributeGrant(...)
→ 
GovernanceManager.delegateDistributeGrant(...) internally calls GrantModule.distributeGrant(....)
→
GrantModule.distributeGrant(....) calls Treasury.requestFund(....)
→  
Treasury adds funding request in mapping
→ 
Funding request appears in multisig wallet interface (Gnosis Safe) or IgnitionZK UI
→ 
Approve button by MultiSig address sends a call to 
Treasury.approveFund(...)
→ 
Funds are transferred

┌───────────────┐                 ┌───────────────┐                 ┌──────────────┐
│  Proposal     │                 │  Zero-Knowledge│                 │  Governance  │
│  Approved     │                 │  Verification  │                 │  Layer       │
└───────┬───────┘                 └───────┬───────┘                 └──────┬───────┘
        │                                 │                                │
        ▼                                 ▼                                ▼
┌───────────────┐                 ┌───────────────┐                 ┌──────────────┐
│  Proposer     │───generates────▶│  ZK Proof of  │────submits────▶│  Governance  │
│  Claims Funds │                 │  Ownership    │                 │  Manager     │
└───────────────┘                 └───────────────┘                 └──────┬───────┘
                                                                           │
                                                                           │delegates
                                                                           ▼
                                  ┌───────────────┐                 ┌──────────────┐
                                  │  Treasury     │◀────requests────│  Funding     │
                                  │  Contract     │                 │  Module      │
                                  └───────┬───────┘                 └──────────────┘
                                          │
                                          │records
                                          ▼
                                  ┌───────────────┐
                                  │  Funding      │
                                  │  Request      │
                                  └───────┬───────┘
                                          │
                                          │appears in
                                          ▼
┌───────────────┐                 ┌───────────────┐
│  Funds        │◀────approves────│  DAO MultiSig │
│  Released     │                 │  Interface    │
└───────────────┘                 └───────────────┘