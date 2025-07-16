# Deployment Guide - Step by Step with OpenZeppelin Upgrades

This guide walks you through deploying the upgradeable smart contracts using the OpenZeppelin upgrades plugin in separate steps.

## Prerequisites

1. **Environment Setup**: Ensure your `.env` file has the required variables:

   ```
   PRIVATE_KEY=your_private_key_here
   ALCHEMY_SEPOLIA_URL=your_alchemy_url_here
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   ```

2. **Dependencies**: Make sure all dependencies are installed:

   ```bash
   npm install
   ```

3. **Network Configuration**: The deployment is configured for Sepolia testnet.

4. **Verifier Contracts**: Make sure all Verifier contract modules are deployed via Hardhat Ignition:
```
npx hardhat ignition deploy ignition/modules/ProposalVerifierModule.js --network sepolia
```
and 
```
npx hardhat ignition deploy ignition/modules/ProposalClaimVerifierModule.js --network sepolia
```


## Deployment Steps

### Step 1: Deploy ERC721IgnitionZK Implementation

Deploy the NFT implementation contract (not a proxy):

```bash
npx hardhat run scripts/deploy-step1-erc721.js --network sepolia
```

**Save the output address** - you'll need it for Step 2.

### Step 2: Deploy MembershipManager as UUPS Proxy

1. **Update the script**: Open `scripts/deploy-step2-membershipmanager.js`
2. **Replace the placeholder**: Update `NFT_IMPLEMENTATION_ADDRESS` with the address from Step 1
3. **Run the deployment**:
   ```bash
   npx hardhat run scripts/deploy-step2-membership-proposal-manager.js --network sepolia
   ```

**Save the output proxy address** (this is your **MembershipManager Proxy**) - you'll need it for Step 3.

### Step 3: Deploy Governor as UUPS Proxy

1. **Update the script**: Open `scripts/deploy-step3-governor.js`
2. **Replace the placeholder**: Update `MEMBERSHIP_MANAGER_ADDRESS` with the proxy address from Step 2
3. **Run the deployment**:
   ```bash
   npx hardhat run scripts/deploy-step3-governor.js --network sepolia
   ```

**Save the output proxy address** (this is your **Governor Proxy**) - you'll need it for Step 4.

### Step 4: Finalize Deployment & Setup Ownership

1. **Update the script**: Open `scripts/deploy-step4-finalize.js`
2. **Replace the placeholders**: Update both `MEMBERSHIP_MANAGER_ADDRESS`, `GOVERNOR_ADDRESS` & `NFT_IMPLEMENTATION`
3. **Run the finalization**:
   ```bash
   npx hardhat run scripts/deploy-step4-finalize.js --network sepolia
   ```

## Helper Scripts

### Identify Deployed Contracts

To see which addresses are MembershipManager and which are Governor, run:

```bash
npx hardhat run scripts/identify-contracts.js --network sepolia
```

This script will:

- List all implementation and proxy addresses
- Clearly label which is **MembershipManager** and which is **Governor**
- Show the relayer and verifier addresses for extra clarity

### Example Output

```
🔧 IMPLEMENTATION CONTRACTS:
1. Address: 0xFDFc5aBEf488271F5Ce554511DDaf800D2deDE1A
   📋 Type: MembershipManager Implementation
2. Address: 0x2CF37e7a8d5BFf735ABD37aBa813CcF82256129f
   📋 Type: Governor Implementation

📦 PROXY CONTRACTS:
1. Proxy Address: 0xCd07Bf51Ccd58A3B43eF407ca771497DE7744672
   📋 Contract Type: MembershipManager Proxy
2. Proxy Address: 0x62f8A5d3A2B578D46fdd8e9C02Ab0C30c2d9F9B9
   📋 Contract Type: Governor Proxy
```

## Contract Architecture

After deployment, the contract relationships will be:

```
Owner/Relayer (EOA)
    ↓ owns
Governor (UUPS Proxy)
    ↓ owns
MembershipManager (UUPS Proxy)
    ↓ owns (is admin)
ERC721IgnitionZK (Implementation)
```

## Verification

### Verify Contracts on Etherscan

After deployment, verify your contracts:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> [CONSTRUCTOR_ARGS]
```

### Test the Setup

You can test the deployment by:

1. **Checking ownership**:

   ```javascript
   const membershipManagerOwner = await membershipManager.owner();
   const governorOwner = await governor.owner();
   ```

2. **Deploying a group NFT**:
   ```javascript
   await governor.delegateDeployGroupNft(groupKey, "Test Group", "TEST");
   ```

## Troubleshooting

### Common Issues

1. **Gas Issues**: If deployment fails due to gas, increase gas limits in `hardhat.config.js`
2. **Address Mismatch**: Ensure you're using the correct addresses from previous steps
3. **Network Issues**: Verify your RPC URL and network configuration

### Reset Deployment

To start over:

1. Delete the `.openzeppelin` folder
2. Clear the `cache` folder
3. Start from Step 1

## Security Notes

- Keep your private key secure
- Verify all contract addresses before proceeding
- Test on testnet before mainnet deployment
- Consider using a multisig wallet for production deployments

## Next Steps

After successful deployment:

1. **Frontend Integration**: Update your frontend with the deployed contract addresses
2. **Testing**: Run comprehensive tests on the deployed contracts
3. **Documentation**: Update your project documentation with the new addresses
4. **Monitoring**: Set up monitoring for your deployed contracts
