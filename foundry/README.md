## IgnitionZK Foundry Tests

This directory contains supplementary Foundry tests for the IgnitionZK contracts, focused on fuzz testing critical components.

### Testing Approach
Hardhat serves as our primary testing framework: [Hardhat Tests](../hardhat/test)

We use only Foundry specifically for property-based fuzz testing.

### Running Tests

**Run all tests**
```
forge test
```

**Run specific fuzz tests**
```
forge test --match-test testFuzz
```

**Increase fuzz runs**
```
forge test --fuzz-runs 1000
```

## License
These tests are dual-licensed under GPL-3.0 and MIT. See the project root for license details.