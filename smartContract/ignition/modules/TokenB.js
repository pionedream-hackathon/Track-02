// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TokenB_Module", (m) => {
    const tokenName = "token B";
    const tokenSymbol = "TKB";
    const initialSupply = ethers.parseEther("1000000");

    const tokenB = m.contract("ERC20Mock", [tokenName, tokenSymbol, initialSupply]);

    return { tokenB };
});
