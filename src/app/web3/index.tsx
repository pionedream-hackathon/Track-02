import { ABITOKEN } from "@/abi/abiTokenContract";
import { BrowserProvider, Contract, formatUnits } from "ethers";

export async function getBalance(
  walletProvider: any,
  tokenAddress: string,
  walletAddress: string
): Promise<any> {
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
    if (parts[1] && parts[1].length > decimals) {
      console.warn(
        `Balance ${formattedBalance} truncated to ${decimals} decimals`
      );
      return `${parts[0]}.${parts[1].slice(0, decimals)}`;
    }

    return formattedBalance;
  } catch (error) {
    console.log("Error fetching balance:", error);
  }
}
