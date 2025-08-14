# Beacon Architecture 

## 1. Why Beacon Proxies
Beacon proxies let you upgrade many proxy instances (treasuries) at once by updating a single beacon’s implementation pointer. Each proxy keeps its own storage; logic is shared.

## 2. Core Actors (General Pattern)

| Component | Responsibility | Key Functions |
|-----------|----------------|---------------|
| UpgradeableBeacon | Stores current implementation address | implementation(), upgradeTo() |
| BeaconProxy | Delegates every call to beacon.implementation() | (constructor(beacon, initData)) |
| IBeacon | Interface that exposes implementation() | implementation() |
| Implementation (Logic) | Contains upgradeable contract code (no constructor logic relied on) | initialize(...), business methods |
| Manager (optional) | Owns & upgrades the beacon; may wrap IBeacon | upgradeImplementation() |

## 3. Call Flow

```
User / Relayer
   │
   ▼
BeaconProxy (per DAO treasury)
   │  (asks each call)
   ▼
Beacon (implementation())
   │  (returns address)
   ▼
Implementation (TreasuryManager logic; delegatecall executes in proxy storage)
```

## 4. Upgrade Flow (High Level)

1. Deploy new implementation (TreasuryManager Vn).
2. Manager (owner) calls upgradeImplementation(newImpl) on BeaconManager.
3. BeaconManager updates underlying UpgradeableBeacon.
4. All existing BeaconProxies now execute new logic, preserving state.

No per-proxy calls needed.

## 5. Storage & Initialization

- Proxies do not run constructors of the implementation.
- Implementation uses OpenZeppelin *Upgradeable* base contracts (Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, etc.).
- Each proxy is initialized once via a delegatecall during its BeaconProxy constructor using `initData` (encoded call to initialize()).
- DO NOT change ordering/types of existing state variables between versions. Append only.

## 6. IgnitionZK Beacon Pattern

BeaconManager implements IBeacon.

```
BeaconManager (Ownable + IBeacon)
  └─ holds UpgradeableBeacon (private immutable _beacon)
       ├─ implementation()  (exposed via BeaconManager forwarding)
       └─ upgradeTo(newImpl) (invoked only by BeaconManager)
```

TreasuryFactory:
- Stores the BeaconManager address (because BeaconManager implements IBeacon).
- When deploying a new treasury:
  - Encodes initialize() calldata for TreasuryManager.
  - Deploys a BeaconProxy pointed at BeaconManager (acts as beacon).
  - BeaconProxy constructor delegatecalls initialize() on the current implementation.

TreasuryManager (Implementation):
- Upgradeable pattern: initialize(...) instead of constructor.
- Roles: DEFAULT_ADMIN_ROLE, GOVERNANCE_MANAGER_ROLE, FUNDING_MODULE_ROLE, etc.
- Timelocked transfer lifecycle: request → approve → execute (with optional combined path).

## 7. Sequence Diagram (Deploy + Upgrade)

### Initial Deployment

```
Deployer
  │ deploy BeaconManager(initialImpl, owner)
  │ deploy TreasuryFactory(beaconManager, governanceManager, grantModule)
  │ TreasuryFactory.deployTreasury(groupKey, hasNft)
  ▼
BeaconProxy --constructor-->
  calls initialize() (delegatecall into implementation)
```

### Upgrade

```
Owner (governance)
  │
  │ upgradeImplementation(newImpl)
  ▼
BeaconManager
  │ calls _beacon.upgradeTo(newImpl)
  ▼
UpgradeableBeacon updates implementation pointer
  │
  └─ All existing BeaconProxies now route to newImpl
```

## 8. Why BeaconManager Wraps UpgradeableBeacon

- Centralizes upgrade authority (Ownable).
- Adds potential governance policies (e.g., delay, multi-sig enforcement).
- Presents a single IBeacon-compatible surface to proxies.
- Hides underlying beacon address (encapsulation).

## 9. Security & Best Practices

| Area | Guideline |
|------|-----------|
| Access Control | Restrict upgradeImplementation() to a governance/owner (multi-sig recommended). |
| Storage Layout | Never reorder/remove existing state vars; append new vars at end. |
| Initialization | Guard initialize() with `initializer` (OZ’s Initializable) to prevent re-entry or replay. |
| Upgrade Testing | Run storage layout diff (e.g., hardhat-storage-layout) before upgrades. |
| Reentrancy | Guard external state-changing functions that transfer value. |
| Event Emission | Emit Upgrade events in BeaconManager to aid audit trail. |
| Validation | Optionally add implementation code size > 0 check before upgrade. |
| Emergency | Consider adding a pause switch for critical functions or a rollback path. |

## 10. Comparison: Beacon vs Transparent vs UUPS

| Dimension | Beacon | Transparent Proxy | UUPS |
|-----------|--------|-------------------|------|
| Many Instances | Single upgrade affects all | One upgrade per proxy | One upgrade per proxy |
| Central Risk | Beacon compromise affects all | Each proxy isolated | Each proxy isolated |
| Gas per Call | Extra beacon lookup (cheap) | Direct | Direct |
| Complexity | Moderate | Low | Moderate (in-proxy upgrade logic) |
| Recommended For | Fleets of homogeneous proxies (Treasuries) | Single/small set | Fleets needing per-proxy upgrade autonomy |

## 11. Typical Extension Hooks

Potential future additions in BeaconManager:
- Timelocked upgrade (queue + execute).
- Upgrade event:
  ```
  event ImplementationUpgraded(address indexed newImplementation);
  ```
- Metadata / version registry.

## 12. Example Snippets (Current Pattern)

### BeaconManager (IBeacon forwarding)

```solidity
function implementation() external view override returns (address) {
    return _beacon.implementation();
}

function upgradeImplementation(address newImpl) external onlyOwner {
    require(newImpl.code.length > 0, "No code");
    _beacon.upgradeTo(newImpl);
    emit ImplementationUpgraded(newImpl);
}
```

### TreasuryFactory Deploy

```solidity
bytes memory initData = abi.encodeWithSelector(
    ITreasuryManager.initialize.selector,
    owner(),          // DEFAULT_ADMIN_ROLE
    governanceManager,
    grantModule,
    beaconManager     // emergency / recovery role
);

BeaconProxy proxy = new BeaconProxy(beaconManager, initData);
```

## 13. Upgrade Checklist

1. Write new implementation contract (append vars at end).
2. Run tests + storage layout diff.
3. Deploy new implementation (no initialize call).
4. Call upgradeImplementation(newImpl) via governance.
5. (Optional) Verify version: call getContractVersion() through a proxy.
6. Monitor events / logs.

## 15. Summary

- BeaconManager is IBeacon + upgrade authority.
- Beacon proxies delegate to current implementation obtained via BeaconManager.
- Upgrades are atomic and fleet-wide.
- Maintain strict storage discipline and restricted upgrade path.

This design is appropriate for a multi-DAO treasury system: simple, centralized governance-managed upgrade surface, minimal per-proxy overhead.

## 16. Glossary

| Term | Definition |
|------|------------|
| Beacon | Contract returning active implementation (implementation()). |
| BeaconProxy | Proxy that delegates to beacon.implementation(). |
| Implementation | Logic contract containing functions/state layout template. |
| Manager | Owner/guardian of the beacon; executes upgrades. |
| initialize | Setup function run once per proxy