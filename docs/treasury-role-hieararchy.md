# Role Hierarchy in Treasury System

This document outlines the role hierarchy and access control structure for the Ignition ZK Treasury System, consisting of three main components: TreasuryManager, BeaconManager, and TreasuryFactory.

## TreasuryManager

### Roles

| Role | Constant | Description | Capabilities |
|------|----------|-------------|-------------|
| **DEFAULT_ADMIN_ROLE** | `0x00` | Primary administrative role | Add/remove funding types, add/remove modules, approve transfers, transfer admin role, view treasury info |
| **GOVERNANCE_MANAGER_ROLE** | `keccak256("GOVERNANCE_MANAGER_ROLE")` | Governance operations | View treasury info, participate in governance decisions |
| **FUNDING_MODULE_ROLE** | `keccak256("FUNDING_MODULE_ROLE")` | Funding modules | Request transfers from treasury |
| **EMERGENCY_RECOVERY_ROLE** | `keccak256("EMERGENCY_RECOVERY_ROLE")` | Emergency recovery | Grant DEFAULT_ADMIN_ROLE in emergencies |

### Role Assignment Flow

1. **Initialization**:
   - `DEFAULT_ADMIN_ROLE` → initially (temporarily) assigned to the GovernanceManager
   - `GOVERNANCE_MANAGER_ROLE` → assigned to GovernanceManager
   - `FUNDING_MODULE_ROLE` → assigned to initial grant module
   - `EMERGENCY_RECOVERY_ROLE` → assigned to BeaconManager

2. **Ownership Transfer**:
   - `DEFAULT_ADMIN_ROLE` is transferred from GovernanceManager to DAO multisig via `transferAdminRole()`
   - This function both grants the role to the new admin AND revokes it from the caller

3. **Emergency Recovery**:
   - BeaconManager can grant `DEFAULT_ADMIN_ROLE` to a new address via `emergencyAccessControl()`. 
   - The BeaconManager functions can be called only by the BeaconManager owner: 
        - In production: the IgnitionZK multisig 
        - In development: the relayer

## BeaconManager

### Ownership

BeaconManager uses the OpenZeppelin `Ownable` pattern rather than roles:

| Role | Implementation | Description | Capabilities |
|------|---------------|-------------|-------------|
| **Owner** | `Ownable` | Ultimate control of beacon | Update implementation contract for all proxies |

### Ownership Flow

1. **Deployment**:
   - Owner is set to the deployer, then immediately transferred to the IgnitionZK multisig wallet via `transferOwnership(beaconOwner)` 
   - During development: the relayer acts as the owner

2. **Upgrade Control**:
   - Only the owner can call `updateImplementation()`
   - This affects all proxy instances simultaneously
   
Design Rationale

This architecture decouples the BeaconManager from the GovernanceManager, with both owned by the same entity (IgnitionZK multisig / relayer during development). This separation provides several benefits:

- Separation of concerns: GM handles treasury creation, BeaconManager handles upgrades
- GM and BeaconManager owner are responsible for all system critical actions such as upgrades.
- Fault isolation: Issues in one component don't automatically affect the other


## TreasuryFactory

### Ownership

TreasuryFactory also uses the OpenZeppelin `Ownable` pattern:

| Role | Implementation | Description | Capabilities |
|------|---------------|-------------|-------------|
| **Owner** | `Ownable` | Treasury deployment control | Deploy new treasury instances for DAOs |

### Ownership Flow

1. **Deployment**:
   - Owner is set to the deployer, then transferred to GovernanceManager
   - `transferOwnership(governanceManager)`

2. **Treasury Deployment Control**:
   - Only the owner (GovernanceManager) can call `deployTreasury()`
   - GovernanceManager calls deployTreasury() via its delegateDeployTreasury() function
   - Each treasury deployment creates a new beacon proxy with its own state


## Security Considerations

1. **Separation of Concerns**:
   - BeaconManager controls implementation logic (upgrades)
   - TreasuryFactory controls instance creation
   - Each treasury controls its own funds and operations

2. **Emergency Access**:
   - BeaconManager has emergency access to treasuries
   - This provides a recovery path if normal admin access is lost
   - Emergency access never revokes existing admin rights

3. **Role Revocation**:
   - When transferring the admin role, the old admin's role is properly revoked
   - transferAdminRole() both grants the new admin and revokes the caller
4. **Environment-Specific Configurations**:
   - In production: IgnitionZK multisig has ultimate control
   - In development: Relayer temporarily assumes these roles for testing
5. **Critical Functions**: 
   - Treasury funds can only be moved via approved transfers
   - Implementation upgrades require multisig approval
   - Treasury deployment requires proper governance
