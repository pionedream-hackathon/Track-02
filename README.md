# README.md: Hướng dẫn Thiết lập Component SwapUI cho Ứng dụng Web3 Swap Token

## Giới thiệu

Dự án này là một component React UI cho chức năng swap token trên blockchain, sử dụng Next.js (với "use client" cho client-side rendering). Component này tích hợp kết nối ví Web3 qua Reown AppKit, lấy balance token sử dụng Ethers và Viem, và giao diện sử dụng Shadcn UI, Framer Motion cho animation, và Lucide Icons.

Component hỗ trợ:

- Chọn token từ/to.
- Hiển thị balance token thực tế từ ví người dùng.
- Ước tính lượng token nhận được (sử dụng rate giả định, cần thay bằng oracle thực tế).
- Nút Max để lấy toàn bộ balance.
- Cài đặt slippage.
- Kết nối ví và thực hiện swap (phần logic swap cần tích hợp thêm với contract router như Uniswap).

**Lưu ý:** Đây là UI-only với một số logic demo. Bạn cần tích hợp logic swap thực tế (ví dụ: gọi contract qua Wagmi hoặc Ethers).

## Yêu cầu Hệ thống

- Node.js phiên bản >= 20.x.
- Yarn hoặc NPM làm package manager.
- Tài khoản Reown (trước đây là WalletConnect) để cấu hình AppKit cho kết nối ví (xem tài liệu Reown để lấy project ID).

## Các File Cần Thiết

Dưới đây là cấu trúc file cơ bản cần thiết để chạy component. Giả sử dự án Next.js đã được khởi tạo.

### 1. **File Hỗ Trợ**

- **`lib/token.ts`**: Định nghĩa mảng TOKENS.(Mock Data)

  ```typescript
  // lib/token.ts
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

- **`abi/abiTokenContract.ts`**: ABI cho ERC20 token (dùng để lấy balance).

  ```typescript
  // abi/abiTokenContract.ts
  export const ABITOKEN = [
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "approve",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "balanceOf",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    // .....
  ];
  ```

- **`app/layout.tsx`**: Để wrap AppKit (cần thiết cho Reown).

  ```typescript
  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <AppKit>{children}</AppKit>
        </body>
      </html>
    );
  }
  ```

- **`app/globals.css`**: Để tùy chỉnh Tailwind CSS (Shadcn UI sử dụng Tailwind).
  - Đảm bảo import `@tailwind base; @tailwind components; @tailwind utilities;`.

### 3. **Dependencies Cần Cài Đặt**

- Core: `react`, `react-dom`, `next`.
- UI: `@shadcn/ui` (cài đặt qua Shadcn CLI: `npx shadcn-ui init` và thêm components: card, button, input, select, label, separator).
- Icons: `lucide-react`.
- Animation: `framer-motion`.
- Web3: `@reown/appkit/react`, `ethers`.
- Khác: `formatUnits` từ ethers đã có.

## Hướng Dẫn Cài Đặt và Khởi Tạo

### Bước 1: Khởi Tạo Dự Án Next.js

```bash
npx create-next-app@latest my-swap-app
cd my-swap-app
```

### Bước 2: Cài Đặt Dependencies

Sử dụng NPM hoặc Yarn:

```bash
npm install @reown/appkit @reown/appkit-adapters-ethers ethers lucide-react framer-motion
npx shadcn-ui@latest init
npx shadcn-ui@latest add card button input select label separator
```

### Bước 3: Cấu Hình Reown AppKit

- Đăng ký project tại [Reown Dashboard](https://cloud.reown.com/) để lấy `projectId`.
- Wrap app với Providers như ví dụ ở trên.
- Trong `app/layout.tsx`:

  ```typescript
  import { Providers } from "./providers";

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html lang="en">
        <body>
          <AppKit>{children}</AppKit>
        </body>
      </html>
    );
  }
  ```

### Bước 4: Thêm Các File Hỗ Trợ

- Tạo `lib/token.ts` và `abi/abiTokenContract.ts` như trên.
- Sao chép code SwapUI vào `components/SwapUI.tsx` hoặc trực tiếp vào page.

### Bước 5: Sử Dụng Component

- Trong `app/page.tsx`:

  ```typescript
  import SwapUI from "@/components/SwapUI";

  export default function Home() {
    return <SwapUI />;
  }
  ```

### Bước 6: Chạy Dự Án

```bash
npm run dev
```

- Truy cập `http://localhost:3000` để xem UI.
- Kết nối ví (hỗ trợ MetaMask, WalletConnect, v.v.).
- Test balance: Chọn token có address hợp lệ trên chain (ví dụ: Mainnet).

## Tùy Chỉnh Thêm

- **Tích Hợp Swap Thực Tế:** Trong hàm `onSwap`, sử dụng Ethers hoặc Wagmi để gọi contract router (ví dụ: Uniswap V3). Xử lý approve nếu cần.
- **Lấy Rate Thực Tế:** Thay rate giả bằng API oracle như Chainlink.
- **Xử Lý Native Token (ETH):** Đối với ETH, sử dụng `provider.getBalance(address)` thay vì contract.
- **Lỗi Thường Gặp:** Đảm bảo chain khớp (mainnet/testnet), và xử lý nếu token không có address (native).

## License

MIT License.
