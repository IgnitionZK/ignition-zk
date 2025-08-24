### Phase 5: Proposal Execution

Phase 5 covers the execution of accepted proposals, focusing on the secure and modular disbursement of funds from the DAO treasury. This phase involves several smart contract modules, including the `GovernanceManager`, `GrantModule` (or other funding modules), `TreasuryFactory`, and `TreasuryManager`. The process ensures that only proposals that have passed all governance checks can trigger funding, and that all transfers are subject to admin approval and timelocks.


#### Step 5.1 Funding Module Trigger

Once a proposal is accepted (majority "yes" & quorum reached) and claimed by its creator, the `GovernanceManager` triggers the appropriate funding module. The funding type is determined by the proposal payload (e.g., grant, bounty).

- **Contract:** [`GovernanceManager`](../hardhat/contracts/governance/GovernanceManager.sol)
- **Key Function:** `delegateDistributeFunding`
- **Logic:**
  - Checks that the proposal is accepted and claimed.
  - Verifies the proposal's nullifier to ensure that funding is being requested for the correct proposal.
  - Looks up the active funding module for the requested funding type.
  - Calls the funding module (e.g., `GrantModule`) to initiate the transfer request.

#### Step 5.2 Funding Module Requests Disbursement

The selected funding module (e.g., `GrantModule`) receives the request from the `GovernanceManager` and relays it to the correct DAO treasury instance.

- **Contract:** [`GrantModule`](../hardhat/contracts/fundingModules/GrantModule.sol)
- **Key Function:** `distributeGrant`
- **Logic:**
  - Receives the group treasury address, context key, recipient, and amount.
  - Calls the treasury instance’s `requestTransfer` function.
  - Emits events for traceability.

#### Step 5.3 Treasury Receives Transfer Request

The DAO treasury, a deployed instance based on the [`TreasuryManager`](../hardhat/contracts/treasury/TreasuryManager.sol) template, receives the transfer request from the funding module.

- **Contract:** [`TreasuryManager`](../hardhat/contracts/treasury/TreasuryManager.sol) instance
- **Key Function:** `requestTransfer`
- **Logic:**
  - Stores the funding request in a mapping, keyed by a unique context (group, epoch, proposal).
  - Activates a 3-day timelock (`releaseTime`) before the transfer can be executed.
  - Only the treasury admin (DAO multisig) can approve, execute, or cancel funding requests.
  - Emits events for request creation.


#### Step 5.3 Transfer Approval and Execution

After the timelock, the treasury admin reviews the request:

- **Approval:** The admin calls `approveTransfer`, marking the request as approved.
- **Execution:** The admin calls `executeTransfer` to send funds to the recipient.
- **Combined:** Optionally, `approveAndExecuteTransfer` can be used to approve and execute in one step if the timelock has expired.

- **Checks:**
  - Only the admin can approve or execute.
  - The request must not be already executed or cancelled.
  - The funding module must match the one that initiated the request.
  - Sufficient treasury balance is required.

- **Events:** `TransferApproved`, `TransferExecuted`, `TransferCancelled`.

#### Treasury Lock Mechanism


To mitigate risk, the treasury admin can lock the treasury:

- **Lock:** Calling `lockTreasury` prevents any outgoing transfers for 3 days.
- **Extend:** The lock period can be extended by calling the lock function again.
- **Unlock:** The admin can manually unlock, or the treasury auto-unlocks after the lock period on the next transfer attempt.
- **Events:** `TreasuryLocked`, `TreasuryUnlocked`.

#### 5.6. TreasuryFactory Role

- **Contract:** [`TreasuryFactory`](../hardhat/contracts/treasury/TreasuryFactory.sol)
- **Logic:**
  - Deploys new treasury instances as beacon proxies.
  - Only the `GovernanceManager` (owner) can deploy new treasuries.
  - Each group gets its own isolated treasury instance.


#### Key Security and Governance Features

- **Modular Funding:** Pluggable modules (UUPS) for different funding types.
- **Timelock:** 3-day delay for all transfers, allowing for review and cancellation.
- **Role-Based Access:** Only authorized admins can approve/execute/cancel.
- **Lockdown:** Emergency lock halts all outgoing transfers.
- **Event Logging:** All critical actions emit events for auditability.

---
**References:**
- [`GovernanceManager.sol`](../hardhat/contracts/governance/GovernanceManager.sol)
- [`TreasuryManager.sol`](../hardhat/contracts/treasury/TreasuryManager.sol)
- [`TreasuryFactory.sol`](../hardhat/contracts/treasury/TreasuryFactory.sol)
- [`GrantModule.sol`](../hardhat/contracts/fundingModules/GrantModule.sol)