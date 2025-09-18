"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowDown, Settings, Repeat } from "lucide-react";
import { motion } from "framer-motion";
import { TOKENS } from "@/lib/token";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from "@reown/appkit/react";
import { formatUnits } from "viem";
import { BrowserProvider, Contract } from "ethers";
import { ABITOKEN } from "@/abi/abiTokenContract";

// Import the getBalance function
export async function getBalance(
  walletProvider: any,
  tokenAddress: string,
  walletAddress: string
): Promise<string | null> {
  try {
    if (!tokenAddress || !walletAddress) {
      throw new Error("Missing tokenAddress or walletAddress");
    }

    const provider = new BrowserProvider(walletProvider);

    const tokenContract = new Contract(tokenAddress, ABITOKEN, provider);

    const balance = await tokenContract.balanceOf(walletAddress);
    const decimals = await tokenContract.decimals();

    const formattedBalance = formatUnits(balance, decimals);

    const parts = formattedBalance.split(".");
    if (parts[1] && parts[1].length > Number(decimals)) {
      console.warn(
        `Balance ${formattedBalance} truncated to ${decimals} decimals`
      );
      return `${parts[0]}.${parts[1].slice(0, Number(decimals))}`;
    }

    return formattedBalance;
  } catch (error) {
    console.log("Error fetching balance:", error);
    return null;
  }
}

export default function SwapUI() {
  const [fromToken, setFromToken] = useState(TOKENS[0].symbol);
  const [toToken, setToToken] = useState(TOKENS[1].symbol);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const { walletProvider } = useAppKitProvider("eip155");

  // Balance states
  const [fromTokenBalance, setFromTokenBalance] = useState("0.00");
  const [toTokenBalance, setToTokenBalance] = useState("0.00");
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  // Fetch balances when wallet connects or tokens change
  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected || !address) {
        setFromTokenBalance("0.00");
        setToTokenBalance("0.00");
        return;
      }

      setIsLoadingBalances(true);

      if (!walletProvider) {
        setIsLoadingBalances(false);
        return;
      }

      try {
        // Fetch from token balance
        const fromTokenData = TOKENS.find((t) => t.symbol === fromToken);
        if (fromTokenData?.address) {
          const fromBalance = await getBalance(
            walletProvider,
            fromTokenData.address,
            address
          );
          setFromTokenBalance(fromBalance || "0.00");
        }

        // Fetch to token balance
        const toTokenData = TOKENS.find((t) => t.symbol === toToken);
        if (toTokenData?.address) {
          const toBalance = await getBalance(
            walletProvider,
            toTokenData.address,
            address
          );
          setToTokenBalance(toBalance || "0.00");
        }
      } catch (error) {
        console.error("Error fetching balances:", error);
        setFromTokenBalance("0.00");
        setToTokenBalance("0.00");
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [isConnected, address, fromToken, toToken, walletProvider]);

  const rate = useMemo(() => {
    // Fake rates for UI demo. Replace with on-chain price or oracle.
    if (fromToken === toToken) return 1;
    if (fromToken === "ETH" && toToken === "USDC") return 1800;
    if (fromToken === "USDC" && toToken === "ETH") return 1 / 1800;
    if (fromToken === "DAI" && toToken === "ETH") return 1 / 1800;
    if (fromToken === "WBTC" && toToken === "ETH") return 14; // placeholder
    return 1;
  }, [fromToken, toToken]);

  const estimateToAmount = (amtStr: string) => {
    const num = Number(amtStr || 0);
    if (!num || !isFinite(num)) return "";
    return String(Number((num * rate).toFixed(6)));
  };

  const onFromAmountChange = (v: string) => {
    setFromAmount(v);
    setToAmount(estimateToAmount(v));
  };

  const swapTokens = () => {
    // simple UI swap animation / logic
    setFromToken((prev) => {
      const prevFrom = prev;
      setToToken(prevFrom);
      return toToken;
    });
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const onSwap = async () => {
    setIsSwapping(true);
    try {
      // TODO: create transaction, call router contract, handle gas, slippage.
      await new Promise((res) => setTimeout(res, 1200));
      // success toast (you can integrate shadcn toast)
    } catch (e) {
      // error handling
    } finally {
      setIsSwapping(false);
    }
  };

  const onConnect = () => {
    open();
  };

  // Max button handler
  const onMaxFromAmount = () => {
    setFromAmount(fromTokenBalance);
    setToAmount(estimateToAmount(fromTokenBalance));
  };

  const onMaxToAmount = () => {
    setToAmount(toTokenBalance);
    // You might want to calculate the reverse amount here
    setFromAmount(String(Number(toTokenBalance) / rate));
  };

  // Format balance for display
  const formatBalance = (balance: string) => {
    if (isLoadingBalances) return "Loading...";
    if (!balance || Number(balance) === 0) return "0.00";
    return Number(balance).toFixed(2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full max-w-md relative"
    >
      <Button
        onClick={onConnect}
        className="md:text-base text-sm cursor-pointer font-semibold rounded-lg mb-4 bg-blue-600 hover:bg-blue-700 text-white"
        variant={isConnected ? "default" : "secondary"}
      >
        {isConnected && address
          ? `${address.slice(0, 6)}...${address.slice(-4)}`
          : "Connect Wallet"}
      </Button>

      <Card className="backdrop-blur-md bg-white/6 border border-white/6 shadow-2xl">
        <CardHeader className="px-6 pt-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-2xl">Swap</CardTitle>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={swapTokens}
              className="p-2 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-6 pt-2">
          {/* From */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">From</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  Balance: {formatBalance(fromTokenBalance)}
                </span>
                {isConnected && Number(fromTokenBalance) > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onMaxFromAmount}
                    className="h-4 px-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  >
                    Max
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Input
                value={fromAmount}
                onChange={(e) => onFromAmountChange(e.target.value)}
                placeholder="0.0"
                className="text-2xl font-semibold placeholder:opacity-50"
                disabled={!isConnected}
              />

              <div className="w-36">
                <Select
                  value={fromToken}
                  onValueChange={(v) => setFromToken(v)}
                  disabled={!isConnected}
                >
                  <SelectTrigger className="w-full border-blue-500/30 focus:ring-blue-500">
                    <SelectValue placeholder="Token" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOKENS.map((t) => (
                      <SelectItem key={t.symbol} value={t.symbol}>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="font-medium">{t.symbol}</span>
                            <span className="text-xs text-muted-foreground">
                              {t.name}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Arrow Button */}
          <div className="flex justify-center my-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={swapTokens}
              disabled={!isConnected}
              className="p-2 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">To</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  Balance: {formatBalance(toTokenBalance)}
                </span>
                {isConnected && Number(toTokenBalance) > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onMaxToAmount}
                    className="h-4 px-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  >
                    Max
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Input
                value={toAmount}
                onChange={(e) => setToAmount(e.target.value)}
                placeholder="0.0"
                className="text-2xl font-semibold placeholder:opacity-50 bg-gray-50/50"
                disabled={!isConnected}
              />

              <div className="w-36">
                <Select
                  value={toToken}
                  onValueChange={(v) => setToToken(v)}
                  disabled={!isConnected}
                >
                  <SelectTrigger className="w-full border-blue-500/30 focus:ring-blue-500">
                    <SelectValue placeholder="Token" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOKENS.map((t) => (
                      <SelectItem key={t.symbol} value={t.symbol}>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="font-medium">{t.symbol}</span>
                            <span className="text-xs text-muted-foreground">
                              {t.name}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex flex-col">
              <span>Price</span>
              <span className="font-medium text-foreground">
                1 {fromToken} ≈ {rate.toFixed(4)} {toToken}
              </span>
            </div>

            <div className="flex flex-col text-right">
              <span>Slippage</span>
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant={slippage === 0.1 ? "outline" : "ghost"}
                  onClick={() => setSlippage(0.1)}
                  className={`${
                    slippage === 0.1
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                  }`}
                >
                  0.1%
                </Button>
                <Button
                  size="sm"
                  variant={slippage === 0.5 ? "outline" : "ghost"}
                  onClick={() => setSlippage(0.5)}
                  className={`${
                    slippage === 0.5
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                  }`}
                >
                  0.5%
                </Button>
                <Button
                  size="sm"
                  variant={slippage === 1 ? "outline" : "ghost"}
                  onClick={() => setSlippage(1)}
                  className={`${
                    slippage === 1
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                  }`}
                >
                  1%
                </Button>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="px-6 pb-6 pt-2">
          <div className="flex flex-col w-full gap-3">
            <Button
              size="lg"
              onClick={onSwap}
              disabled={
                isSwapping ||
                !isConnected ||
                !fromAmount ||
                Number(fromAmount) <= 0 ||
                Number(fromAmount) > Number(fromTokenBalance)
              }
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isSwapping ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Swapping...
                </>
              ) : (
                `Swap ${fromAmount || "0"} ${fromToken} → ${
                  toAmount || "0"
                } ${toToken}`
              )}
            </Button>

            {!isConnected && (
              <div className="text-xs text-muted-foreground text-center">
                Connect your wallet to swap tokens
              </div>
            )}

            {isConnected && (
              <div className="text-xs text-muted-foreground text-center">
                <span>You'll receive an estimated </span>
                <strong className="text-blue-400">
                  {toAmount || "0.0"} {toToken}
                </strong>
                <span> after fees and slippage.</span>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
