# Hướng Dẫn Tương Tác Web3, DApp và Blockchain - DEX Frontend (Track-02 FE)

## 1. Overview

This project provides a **Next.js + React frontend codebase** for a decentralized exchange (DEX) interface.

Main features:

- Token selection (from/to).
- Wallet balance fetching (via ERC20 contract).
- Mock swap rate (can be replaced with Chainlink oracle).
- Slippage configuration.
- Wallet connection (MetaMask, WalletConnect).
- Swap button (UI only, integration with router contract required).

**Note:** This is a **UI-only demo**. Real swap execution must be added with Ethers/Wagmi.

---

## 2. System Requirements

- Node.js >= **20.x**
- Yarn or npm
- Reown (WalletConnect) account to configure AppKit (`projectId` required).

---

## 3. Installation

```bash
# Create a new Next.js project
npx create-next-app@latest my-swap-app
cd my-swap-app

# Install dependencies
npm install @reown/appkit @reown/appkit-adapters-ethers ethers lucide-react framer-motion
npx shadcn-ui@latest init
npx shadcn-ui@latest add card button input select label separator
```

Configure `.env.local`:

```env
NEXT_PUBLIC_PROJECT_ID=<your Reown projectId>
```

Run the app:

```bash
npm run dev
```

Access via `http://localhost:3000`.

---

## 4. Project Structure

```
FE/
├── app/
│   ├── layout.tsx          # Wraps AppKit
│   ├── page.tsx            # Main page with SwapUI
│   └── globals.css         # TailwindCSS styles
├── components/
│   └── SwapUI.tsx          # Main swap component
├── lib/
│   └── token.ts            # Mock token list
├── abi/
│   └── abiTokenContract.ts # ERC20 ABI
└── README.md
```

---

## 5. Example Code

### `lib/token.ts`

```typescript
export const TOKENS = [
  {
    symbol: "USDP",
    name: "PIONE USD",
    img: "/tokens/eth.svg",
    address: "0x02DE2a1A4A89B90C3a0DD0960947a2cF0Cbc2490",
  },
  {
    symbol: "PIO",
    name: "PIONE Coin",
    img: "/tokens/usdc.svg",
    address: "0x4491f0398753DDD0E69803eba6A3297cFdCAEE4e",
  },
  {
    symbol: "BNB",
    name: "BNB",
    img: "/tokens/dai.svg",
    address: "0x7De9D48b7b64971368224Ad8CB960A5b698990Ec",
  },
  {
    symbol: "USDT",
    name: "Tether USDT",
    img: "/tokens/wbtc.svg",
    address: "0x9c1216BB3176C9cd577851277823DF6a4Cd8A5Dc",
  },
];
```

### `abi/abiTokenContract.ts`

```typescript
export const ABITOKEN = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];
```

### `app/layout.tsx`

```typescript
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppKit>{children}</AppKit>
      </body>
    </html>
  );
}
```

### `app/page.tsx`

```typescript
import SwapUI from "@/components/SwapUI";

export default function Home() {
  return <SwapUI />;
}
```

### `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 6. Smart Contract Interaction

- **Read**: `balanceOf(address)` for wallet balances.
- **Write**: `approve(spender, amount)` for ERC20 tokens.
- **Swap**: Requires integration with router contracts (Uniswap/PancakeSwap).
- **Native token**: Use `provider.getBalance(address)`.

---

## 7. Wallet Management

- Reown AppKit handles wallet connection.
- Supports MetaMask, WalletConnect, etc.
- State managed with React hooks.

---

## 8. Transaction History

Not included.
Future extension: integrate with blockchain explorers (Etherscan API, Zeroscan API).

---

## 9. Notes

- This repo is for **frontend demo purposes**.
- Do not hardcode private keys.
- Swap logic & rates are mocked → replace with:

  - Router contract call (Uniswap V3, Pancake, etc.)
  - Oracle (Chainlink) for real token rates.

---

## License

MIT License
