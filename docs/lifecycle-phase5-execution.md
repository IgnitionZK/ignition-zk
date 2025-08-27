### Phase 5: Proposal Execution

This phase is about securely releasing funds from the DAO treasury after a proposal has passed all checks and been properly claimed. The process is designed to be modular and safe, with multiple layers of review and admin control.

#### Step 5.1 Triggering the Funding Module
Once a proposal is accepted and claimed by its creator, the `GovernanceManager` checks that everything is in order and then routes the request to the right funding module, depending on the proposal type (for example, a grant or bounty). The funding module is chosen based on the proposal’s payload, and the system makes sure the request is for the correct, accepted proposal.

- **Contract:** [`GovernanceManager`](../hardhat/contracts/governance/GovernanceManager.sol)
- **Key Function:** `delegateDistributeFunding`
- **Logic:**
  - Checks that the proposal is accepted and claimed.
  - Verifies the proposal's nullifier to ensure that funding is being requested for the correct proposal.
  - Looks up the active funding module for the requested funding type.
  - Calls the funding module (e.g., `GrantModule`) to initiate the transfer request.

#### Step 5.2 Requesting a Disbursement

The funding module (like `GrantModule`) takes the request and forwards it to the group’s treasury. It passes along all the necessary details: which treasury to use, the context key, the recipient, and the amount. This step is logged on-chain for traceability.

- **Contract:** [`GrantModule`](../hardhat/contracts/fundingModules/GrantModule.sol)
- **Key Function:** `distributeGrant`
- **Logic:**
  - Receives the group treasury address, context key, recipient, and amount.
  - Calls the treasury instance’s `requestTransfer` function.
  - Emits events for traceability.

#### Step 5.3 Treasury Receives the Request

The treasury, which is an upgradeable beacon proxy instance with the `TreasuryManager` as the implementation it points to, receives the funding request. It stores the request and starts a 3-day timelock before any funds can be released. Only the treasury admin (usually a multisig) can approve, execute, or cancel requests. Every new request is logged for transparency.

- **Contract:** [`TreasuryManager`](../hardhat/contracts/treasury/TreasuryManager.sol) instance
- **Key Function:** `requestTransfer`
- **Logic:**
  - Stores the funding request in a mapping, keyed by a unique context (group, epoch, proposal).
  - Activates a 3-day timelock (`releaseTime`) before the transfer can be executed.
  - Only the treasury admin (DAO multisig) can approve, execute, or cancel funding requests.
  - Emits events for request creation.


#### Step 5.3 Approval and Execution

After the timelock, the treasury admin reviews the request:

- The admin calls `approveTransfer`, marking the request as approved.
- The admin calls `executeTransfer` to send funds to the recipient.
- Optionally, `approveAndExecuteTransfer` can be used to approve and execute in one step if the timelock has expired.

- **Checks:**
  - Only the admin can approve or execute.
  - The request must not be already executed or cancelled.
  - The funding module must match the one that initiated the request.
  - Sufficient treasury balance is required.

- **Events:** `TransferApproved`, `TransferExecuted`, `TransferCancelled`.

#### Treasury Lock

For extra safety, the treasury admin can lock the treasury, which blocks all outgoing transfers for three days:
- Calling `lockTreasury` prevents any outgoing transfers for 3 days.
- The lock period can be extended by calling the lock function again.
- The admin can manually unlock, or the treasury auto-unlocks after the lock period ends if a transfer is attempted.
- Events: `TreasuryLocked`, `TreasuryUnlocked`.

#### 5.6. Deploying Treasuries

`TreasuryFactory` is used to deploy new treasury instances as beacon proxies. 

- **Contract:** [`TreasuryFactory`](../hardhat/contracts/treasury/TreasuryFactory.sol)
- **Logic:**
  - Deploys new treasury instances as beacon proxies.
  - Only the `GovernanceManager` (owner) can deploy new treasuries.
  - Each group gets its own isolated treasury instance.


**Security and Governance Features**

- Funding modules are plug-and-play and upgradeable, but always managed by the protocol for consistency.
- Every transfer is subject to a 3-day timelock, giving admins time to review or cancel if needed.
- Only authorized admins can approve, execute, or cancel transfers.
- Emergency lock lets admins halt all outgoing transfers if something looks wrong.
- All actions are logged on-chain for transparency and auditability.

---
**References:**
- [`GovernanceManager.sol`](../hardhat/contracts/governance/GovernanceManager.sol)
- [`TreasuryManager.sol`](../hardhat/contracts/treasury/TreasuryManager.sol)
- [`TreasuryFactory.sol`](../hardhat/contracts/treasury/TreasuryFactory.sol)
- [`GrantModule.sol`](../hardhat/contracts/fundingModules/GrantModule.sol)