
IgnitionZK MultiSig
owns
→
GovernanceManager 

GovernanceManager functions: 
A) onlyOwner (MultiSig) for system critical actions (upgrades, setting Verifiers, setting global quorum thresholds)
B) onlyRelayer for all others

-----

DAO MultiSig
owns
→
Treasury clone

Treasury clone functions:
A) onlyOwner (MultiSig) for approveFund: transfers the funds to recipient
B) onlyFundingModule for requestFund: 


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