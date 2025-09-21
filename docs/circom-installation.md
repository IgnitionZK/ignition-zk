# Circom Installation Guide

This guide will help you install Circom by first installing Rust and Cargo, then building Circom from source.

## 1. Install Rust and Cargo

Cargo is the Rust package manager required to build Circom.

Open your terminal and run:

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Follow the prompts to complete the installation.

After installation, restart your terminal or run:

```sh
source $HOME/.cargo/env
```

Verify Cargo is installed:

```sh
cargo --version
```

## 2. Clone the Circom Repository

```sh
git clone https://github.com/iden3/circom.git
cd circom
git checkout v2.2.2
```

## 3. Build Circom

Inside the `circom` directory, run:

```sh
cargo build --release
```

## 4. Add Circom to Your PATH (Optional)

To use Circom globally, add the binary to your PATH:

```sh
export PATH="$PATH:$(pwd)/target/release"
```

Or copy the binary to `/usr/local/bin`:

```sh
sudo cp target/release/circom /usr/local/bin/
```

## 5. Verify Installation

Check the installed version:

```sh
circom --version
```

You should see:  
`circom 2.2.2`

Circom is now ready to use!