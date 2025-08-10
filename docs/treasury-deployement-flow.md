
1. Deploy Verifiers
2. Deploy IgnitionZK implementation contract without initialization.
3. Deploy MM, PM, VM (temp owner: relayer)
5. Deploy Funding modules (temp owner:relayer)
4. Deploy GM (temp owner:relayer) - without TreasuryFactory
5. Transfer Ownership of MM, PM, VM, Funding Modules to GM.
6. Deploy TreasuryManager without initialization
7. Deploy BeaconManager with the TreasuryManager implementation address (temp owner: relayer)
8. Deploy TreasuryFactory with the beacon manager address (owner: GM)
9. Set TreasuryFactory address in GM 
