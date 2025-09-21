# Quick Start

## 1. Clone the Repository

```sh
git clone https://github.com/IgnitionZK/ignition-zk.git
cd ignition-zk
```

## 2. Environment Setup

- Create a `.env` file in the `hardhat` folder with:
  ```
  ALCHEMY_SEPOLIA_URL=<your-alchemy-sepolia-url>
  PRIVATE_KEY=<your-private-key>
  ```

- Create a `.env` file in the `frontend` folder with:
  ```
  ```


## 3. Install Dependencies

Run the setup script to install all project dependencies:
```sh
./setup-project.sh
```

## 4. Run Tests

To run Hardhat and Foundry tests:
```sh
./run-hardhat-foundry-tests.sh
```


## 6. (Optional) Circom Installation

If you want to run Circom locally for circuit compilation and testing, see the guide:

[Circom Installation Guide](./circom-installation.md)

## 5. Static Analysis

- To set up the Python virtual environment and install Slither:
  ```sh
  ./setup-slither.sh
  ```

- To run static analysis with Slither:
  1. Activate the venv:
     ```sh
     source venv/bin/activate
     ```
  2. Run:
     ```sh
     ./run-static-analysis-slither.sh
     ```

- To run static analysis with Aderyn:
  ```sh
  ./run-static-analysis-aderyn.sh
  ```