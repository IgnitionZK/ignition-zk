
1. Deploy Verifiers
2. Deploy IgnitionZK implementation contract.
3. Deploy MM, PM, VM (temp owner: relayer)
4. Deploy GM (temp owner:relayer) - without TreasuryFactory
5. Transfer Ownership of MM, PM, VM to GM.
6. Deploy TreasuryManager without initialization
7. Deploy BeaconManager with the TreasuryManager implementation address (temp owner: relayer)
8. Deploy TreasuryFactory with the beacon address (owner: GM)
9. Set TreasuryFactory address in GM
