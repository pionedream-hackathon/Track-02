"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { defineChain } from "@reown/appkit/networks";
import { ReactNode, useEffect } from "react";
const projectId = "projectId";

export const zeroscan = defineChain({
  id: 5080,
  caipNetworkId: "eip155:5080",
  chainNamespace: "eip155",
  name: "Pione Zero Chain",
  nativeCurrency: {
    decimals: 18,
    name: "PZO",
    symbol: "PZO",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.zeroscan.org/"],
    },
  },
  blockExplorers: {
    default: {
      name: "PZO",
      url: "https://zeroscan.org/",
    },
  },
});

const metadata = {
  name: "Demo Code",
  description: "",
  url: "https://domain.com",
  icons: ["https://icon.com/favicon.ico"],
};

createAppKit({
  adapters: [new EthersAdapter()],
  networks: [zeroscan],
  defaultNetwork: zeroscan,
  projectId,
  metadata,
  basic: true,

  features: {
    socials: false,
    email: false,
    analytics: false,
    swaps: false,
    send: false,
    onramp: false,
  },
  customWallets: [
    {
      id: "com.companyname.swaptobe",
      name: "PioneWallet",
      homepage: "com.companyname.swaptobe",
      image_url:
        "https://pionechain.com/_next/static/media/pioneWallet.41570c53.png",
      mobile_link: "tobewallet://",
      app_store: "https://apps.apple.com/us/app/pione-wallet/id6738914833",
      play_store:
        "https://play.google.com/store/apps/details?id=com.companyname.swaptobe",
    },
  ],

  themeVariables: {
    "--w3m-color-mix": "#040810",
    "--w3m-color-mix-strength": 40,
    "--w3m-text-color": "#fff",
  },
} as any);

export function AppKit({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
