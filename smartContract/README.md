# DemoSwap - Decentralized Exchange (DEX) Contract

A simple Automated Market Maker (AMM) implementation built with Solidity for educational and demonstration purposes.

## Overview

DemoSwap is a decentralized exchange contract that implements core AMM functionality similar to Uniswap V2. Users can create liquidity pools, provide liquidity, and swap tokens using the constant product formula (x * y = k).

## Features

- **Pool Creation**: Create trading pools for any ERC20 token pairs
- **Liquidity Provision**: Add/remove liquidity to earn trading fees
- **Token Swapping**: Swap tokens with automatic price discovery
- **Fee Collection**: 0.3% trading fee distributed to liquidity providers
- **Price Calculations**: Real-time price quotes and swap calculations

## Contract Architecture

### Core Functions

- `createPool(token0, token1)` - Creates a new liquidity pool
- `addLiquidity(token0, token1, amount0, amount1)` - Adds liquidity to a pool
- `removeLiquidity(token0, token1, liquidity)` - Removes liquidity from a pool
- `swap(tokenIn, tokenOut, amountIn)` - Swaps tokens using AMM formula

### View Functions

- `getPrice(token0, token1)` - Returns the current price ratio
- `getAmountOut(tokenIn, tokenOut, amountIn)` - Calculates swap output
- `getReserves(token0, token1)` - Returns pool reserves
- `getLiquidity(token0, token1, provider)` - Returns user's liquidity

## Technical Specifications

- **Solidity Version**: 0.8.28
- **Network**: PioneZero (pioneZero)
- **Native Token**: PZO
- **Trading Fee**: 0.3% (3/1000)
- **Price Formula**: Constant Product (x * y = k)
- **Liquidity Tokens**: Square root of product for initial liquidity

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <repository-url>
cd Demo-Dex-hackathon
npm install

# 2. Run tests
npm test

# 3. Deploy locally
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

## Development Setup

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Demo-Dex-hackathon

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env file with your keys (see Environment Setup below)

# Compile contracts
npx hardhat compile
```

### Environment Setup

Create a `.env` file from the example and configure your keys:

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
# Your wallet private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# ZeroScan API key for contract verification (optional)
ZEROSCAN_API_KEY=your_zeroscan_api_key_here
```

** Security Notes:**
- Never commit your `.env` file to version control
- Use a separate wallet for testing/development
- Keep your private keys secure and never share them

### Testing

```bash
# Run all tests
npm test

# Run tests with gas reporting
npx hardhat test

# Run specific test file
npx hardhat test test/TokenSwap.js
```

### Deployment

```bash
# Deploy to local network (no private key needed)
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/DemoPioneDex.js --network localhost

# Deploy to testnet (requires PRIVATE_KEY in .env)
npx hardhat ignition deploy ./ignition/modules/DemoPioneDex.js --network pioneZero

# Verify contract on block explorer (requires ZEROSCAN_API_KEY)
npx hardhat verify --network pioneZero <CONTRACT_ADDRESS>
```

**Network Configuration:**
- Local: Uses Hardhat's built-in accounts
- Testnets: Requires `PRIVATE_KEY` in `.env` file
- PioneZero Network: Requires `PRIVATE_KEY` and sufficient PZO for gas

## Testing

```bash
npm test
```

## Security Features

- **Input Validation**: Prevents zero amounts, invalid addresses
- **Reentrancy Protection**: Safe external calls
- **Overflow Protection**: Built-in Solidity 0.8+ protections
- **Pool Existence Checks**: Validates pool exists before operations
- **Token Transfer Verification**: Ensures successful transfers

## Usage Examples

### Creating a Pool

```solidity
// Create a pool for TokenA/TokenB pair
bytes32 poolId = demoSwap.createPool(tokenA, tokenB);
```

### Adding Liquidity

```solidity
// Approve tokens first
tokenA.approve(demoSwapAddress, 1000 * 10**18); // 1000 PZO
tokenB.approve(demoSwapAddress, 2000 * 10**18); // 2000 PZO

// Add liquidity (1:2 ratio)
demoSwap.addLiquidity(tokenA, tokenB, 1000 * 10**18, 2000 * 10**18);
```

### Swapping Tokens

```solidity
// Approve input token
tokenA.approve(demoSwapAddress, 100 * 10**18); // 100 PZO

// Calculate expected output
uint256 expectedOut = demoSwap.getAmountOut(tokenA, tokenB, 100 * 10**18);

// Execute swap
demoSwap.swap(tokenA, tokenB, 100 * 10**18);
```

### Removing Liquidity

```solidity
// Get user's liquidity amount
uint256 userLiquidity = demoSwap.getLiquidity(tokenA, tokenB, userAddress);

// Remove 50% of liquidity
demoSwap.removeLiquidity(tokenA, tokenB, userLiquidity / 2);
```

## AMM Formula Explanation

DemoSwap uses the constant product formula optimized for PioneZero network:

```
x * y = k (constant)
```

Where:
- `x` = Reserve of token0 (in PZO units)
- `y` = Reserve of token1 (in PZO units)
- `k` = Constant product

When swapping:
```
amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
```

The factor of 997/1000 represents the 0.3% trading fee collected in PZO.

## Project Structure

```
Demo-Dex-hackathon/
├── contracts/
│   ├── DemoSwap.sol          # Main AMM contract
│   └── ERC20Mock.sol         # Mock ERC20 for testing
├── test/
│   └── TokenSwap.js          # Comprehensive test suite
├── scripts/
│   └── deploy.js             # Deployment script
├── hardhat.config.js         # Hardhat configuration
└── README.md                 # This file
```

## Disclaimer

**Educational Purpose Only**: This contract is for demonstration and learning purposes. Not audited for production use.

Key limitations:
- No slippage protection
- No deadline mechanism
- Basic fee structure
- No governance features
- Not optimized for gas efficiency in PZO transactions


## License

MIT License - See LICENSE file for details

## References

- [Uniswap V2 Whitepaper](https://uniswap.org/whitepaper.pdf)
- [Automated Market Makers Explained](https://ethereum.org/en/developers/docs/dapps/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

---

Built with ❤️ for the DeFi community