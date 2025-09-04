# Ignition ZK Deployment Guide

This guide explains how to deploy the Ignition ZK governance system using the 5-step deployment process.

## Overview

The deployment process consists of 5 steps that deploy all necessary contracts in the correct order:

1. **Step 0**: Deploy all verifier contracts
2. **Step 1**: Deploy ERC721 implementation
3. **Step 2**: Deploy MembershipManager, ProposalManager and VoteManager with verifier addresses
4. **Step 3**: Deploy GovernanceManager
5. **Step 4**: Transfer ownership of the Managers to the GovernanceManager
6. **Step 5**: Deploy TreasuryManager, BeaconManager, TreasuryFactory, set TreasuryFactory address in GM
7. **Step 6**: Deploy GrantModule, set GrantModule address in GM

## Prerequisites

- Node.js and npm installed
- Hardhat configured for your target network
- Sufficient funds in your deployer account
- All dependencies installed (`npm install`)

## Deployment Steps

### Step 0: Deploy Verifier Contracts

First, deploy all ZK-proof verifier contracts:

```bash
npx hardhat run scripts/deploy-step0-verifiers.js --network <your-network>
```

This will deploy:

- `MembershipVerifier` - Verifies membership proofs
- `ProposalVerifier` - Verifies proposal submission proofs
- `ProposalClaimVerifier` - Verifies proposal claim proofs
- `VoteVerifier` - Verifies voting proofs

**Save the deployed addresses** - you'll need them for Step 2.

### Step 1: Deploy ERC721 Implementation

Deploy the ERC721 implementation contract:

```bash
npx hardhat run scripts/deploy-step1-erc721.js --network <your-network>
```

**Save the deployed address** - you'll need it for Step 2.

### Step 2: Deploy the Managers

Update the addresses in `deploy-step2-managers.js` with the addresses from Steps 0 and 1, then run:

```bash
npx hardhat run scripts/deploy-step2-managers.js --network <your-network>
```

This deploys:

- `MembershipManager` (UUPS proxy) - Manages group memberships and NFT deployments
- `ProposalManager` (UUPS proxy) - Manages proposal submissions and claims
- `VoteManager` (UUPS proxy) - Manages votes on proposals

**Save the deployed addresses** - you'll need them for Step 3.

### Step 3: Deploy GovernanceManager

Update the addresses in `deploy-step3-governanceManager.js` with the addresses from Step 2, then run:

```bash
npx hardhat run scripts/deploy-step3-governanceManager.js --network <your-network>
```

This deploys:

- `GovernanceManager` (UUPS proxy) - Main governance contract that coordinates all operations

**Save the deployed address** - you'll need it for Step 4.

### Step 4: Transfer Ownership of Managers

Update the addresses in `deploy-step4-transferOwnership.js` with all previous addresses, then run:

```bash
npx hardhat run scripts/deploy-step4-transferOwnership.js --network <your-network>
```

This step:

- Transfers ownership of MembershipManager to GovernanceManager
- Transfers ownership of ProposalManager to GovernanceManager
- Verifies all ownership relationships are correct


### Step 5: Deploy the Treasury contracts

Update the addresses in `deploy-step5-treasury.js` with all previous addresses, then run:

```bash
npx hardhat run scripts/deploy-step5-treasury.js --network <your-network>
```

This step:

- Deploys the TreasuryManager
- Deploys the BeaconManager
- Deploys the TreasuryFactory
- Sets the TreasuryFactory address in the GovernanceManager


### Step 6: Deploy the FundingModules

Update the addresses in `deploy-step6-fundingModules.js` with all previous addresses, then run:

```bash
npx hardhat run scripts/deploy-step6-fundingModules.js --network <your-network>
```

This step:

- Deploys the GrantModule
- Adds the GrantModule address in the activeModuleRegistry of the GovernanceManager

### Step 7: Transfer GovernanceManager Ownership

Update the addresses in `deploy-step7-transferGMOwnership.js` with all previous addresses, then run:

```bash
npx hardhat run scripts/deploy-step6-transferGMOwnership.js --network <your-network>
```

This step:
- Transfers the GovernanceManager ownership from the relayer to the IgnitionZK multisig

## Contract Architecture

After deployment, the contract hierarchy is:

```
GovernanceManager (Owner: Deployer)
├── MembershipManager (Owner: GovernanceManager)
│   ├── ERC721IgnitionZK Implementation
├── ProposalManager (Owner: GovernanceManager)
├── VoteManager (Owner: GovernanceManager)
├── TreasuryFactory (Owner: GovernanceManager)
└── FundingModules
    └── GrantModule (Owner: GovernanceManager)
BeaconManager (Owner: Deployer)
```

## Verifier Contracts

The verifier contracts are critical for ZK-proof verification:

- **MembershipVerifier**: Verifies that a user is a valid member of a group
- **ProposalVerifier**: Verifies that a user can submit a proposal (must be a member)
- **ProposalClaimVerifier**: Verifies that a user can claim a proposal they submitted
- **VoteVerifier**: Verifies that a user can vote on proposals (must be a member)

## Important Notes

1. **Address Updates**: You must manually update the hardcoded addresses in each script after running the previous step
2. **Network Configuration**: Ensure your Hardhat config is set up for the target network
3. **Gas Costs**: Verifier contracts are large and deployment can be expensive
4. **Ownership**: The final owner of GovernanceManager should be your DAO or multisig wallet
5. **Upgrades**: All manager contracts are upgradeable via UUPS proxy pattern

## Troubleshooting

### Common Issues

1. **Insufficient Gas**: Increase gas limit in deployment scripts
2. **Wrong Network**: Double-check your Hardhat network configuration
3. **Address Mismatch**: Ensure all addresses are correctly copied between steps
4. **Ownership Errors**: Verify the deployer account has sufficient permissions

### Verification

After deployment, verify that:

- All contracts are deployed and accessible
- Ownership relationships are correctly set
- Verifier contracts can be called by manager contracts
- GovernanceManager can delegate calls to other contracts

## Next Steps

After successful deployment:

1. Verify contracts on block explorers
2. Set up frontend configuration with new contract addresses
3. Test the complete governance flow
4. Transfer GovernanceManager ownership to your DAO
