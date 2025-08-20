
1. Deploy Verifiers
2. Deploy IgnitionZK implementation contract without initialization.
3. Deploy MM, PM, VM (temp owner during dev: relayer, otherwise IgnitionZK multisig)
4. Deploy GM (temp owner during dev: relayer, otherwise IgnitionZK multisig)
5. Transfer Ownership of MM, PM, VM to GM.
6. Deploy TreasuryManager without initialization
7. Deploy BeaconManager with the TreasuryManager implementation address (temp owner during dev: relayer, otherwise IgnitionZK multisig)
8. Deploy TreasuryFactory with the beacon manager address (owner: GM)
9. Deploy Funding modules (owner: GM)
10. Set TreasuryFactory address in GM via `setTreasuryFactory()` (onlyOwner: IgnitionZK multisig)
11. Set FundingModule address in GM via `addFundingModule()` (onlyOwner: IgnitionZK multisig)
