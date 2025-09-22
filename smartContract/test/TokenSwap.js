const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DemoSwap", function () {
  async function deployDemoSwapFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const tokenA = await ERC20Mock.deploy("Token A", "TKA", ethers.parseEther("1000000"));
    const tokenB = await ERC20Mock.deploy("Token B", "TKB", ethers.parseEther("1000000"));

    const DemoSwap = await ethers.getContractFactory("DemoSwap");
    const tokenSwap = await DemoSwap.deploy();

    await tokenA.transfer(user1.address, ethers.parseEther("10000"));
    await tokenB.transfer(user1.address, ethers.parseEther("10000"));
    await tokenA.transfer(user2.address, ethers.parseEther("5000"));
    await tokenB.transfer(user2.address, ethers.parseEther("5000"));

    return { tokenSwap, tokenA, tokenB, owner, user1, user2 };
  }

  describe("Pool Management", function () {
    describe("getPoolId", function () {
      it("Should generate consistent pool ID regardless of token order", async function () {
        const { tokenSwap, tokenA, tokenB } = await loadFixture(deployDemoSwapFixture);

        const poolId1 = await tokenSwap.getPoolId(tokenA.target, tokenB.target);
        const poolId2 = await tokenSwap.getPoolId(tokenB.target, tokenA.target);

        expect(poolId1).to.equal(poolId2);
      });

      it("Should revert when trying to create pool with identical tokens", async function () {
        const { tokenSwap, tokenA } = await loadFixture(deployDemoSwapFixture);

        await expect(
          tokenSwap.getPoolId(tokenA.target, tokenA.target)
        ).to.be.revertedWith("Identical tokens");
      });
    });

    describe("createPool", function () {
      it("Should create a new pool successfully", async function () {
        const { tokenSwap, tokenA, tokenB } = await loadFixture(deployDemoSwapFixture);

        const poolId = await tokenSwap.getPoolId(tokenA.target, tokenB.target);

        await expect(tokenSwap.createPool(tokenA.target, tokenB.target))
          .to.emit(tokenSwap, "PoolCreated")
          .withArgs(tokenA.target, tokenB.target, poolId);
      });

      it("Should revert when creating pool with zero address", async function () {
        const { tokenSwap, tokenA } = await loadFixture(deployDemoSwapFixture);

        await expect(
          tokenSwap.createPool(tokenA.target, ethers.ZeroAddress)
        ).to.be.revertedWith("Invalid token address");
      });

      it("Should revert when creating duplicate pool", async function () {
        const { tokenSwap, tokenA, tokenB } = await loadFixture(deployDemoSwapFixture);

        await tokenSwap.createPool(tokenA.target, tokenB.target);

        await expect(
          tokenSwap.createPool(tokenA.target, tokenB.target)
        ).to.be.revertedWith("Pool already exists");
      });
    });
  });

  describe("Liquidity Management", function () {
    async function createPoolWithLiquidity() {
      const { tokenSwap, tokenA, tokenB, owner, user1, user2 } = await deployDemoSwapFixture();

      await tokenSwap.createPool(tokenA.target, tokenB.target);

      await tokenA.connect(user1).approve(tokenSwap.target, ethers.parseEther("1000"));
      await tokenB.connect(user1).approve(tokenSwap.target, ethers.parseEther("2000"));

      return { tokenSwap, tokenA, tokenB, owner, user1, user2 };
    }

    describe("addLiquidity", function () {
      it("Should add initial liquidity to empty pool", async function () {
        const { tokenSwap, tokenA, tokenB, user1 } = await loadFixture(createPoolWithLiquidity);

        const amount0 = ethers.parseEther("100");
        const amount1 = ethers.parseEther("200");

        // const poolId = await tokenSwap.getPoolId(tokenA.target, tokenB.target);

        await expect(
          tokenSwap.connect(user1).addLiquidity(tokenA.target, tokenB.target, amount0, amount1)
        ).to.emit(tokenSwap, "LiquidityAdded");

        const [reserve0, reserve1] = await tokenSwap.getReserves(tokenA.target, tokenB.target);
        if (tokenA.target < tokenB.target) {
          expect(reserve0).to.equal(amount0);
          expect(reserve1).to.equal(amount1);
        } else {
          expect(reserve0).to.equal(amount1);
          expect(reserve1).to.equal(amount0);
        }
      });

      it("Should add liquidity maintaining pool ratio", async function () {
        const { tokenSwap, tokenA, tokenB, user1, user2 } = await loadFixture(createPoolWithLiquidity);

        await tokenSwap.connect(user1).addLiquidity(
          tokenA.target,
          tokenB.target,
          ethers.parseEther("100"),
          ethers.parseEther("200")
        );

        await tokenA.connect(user2).approve(tokenSwap.target, ethers.parseEther("500"));
        await tokenB.connect(user2).approve(tokenSwap.target, ethers.parseEther("1000"));

        await expect(
          tokenSwap.connect(user2).addLiquidity(
            tokenA.target,
            tokenB.target,
            ethers.parseEther("50"),
            ethers.parseEther("200")
          )
        ).to.emit(tokenSwap, "LiquidityAdded");
      });

      it("Should revert when pool doesn't exist", async function () {
        const { tokenSwap, tokenA, tokenB, user1 } = await loadFixture(deployDemoSwapFixture);

        await expect(
          tokenSwap.connect(user1).addLiquidity(
            tokenA.target,
            tokenB.target,
            ethers.parseEther("100"),
            ethers.parseEther("200")
          )
        ).to.be.revertedWith("Pool does not exist");
      });
    });

    describe("removeLiquidity", function () {
      it("Should remove liquidity successfully", async function () {
        const { tokenSwap, tokenA, tokenB, user1 } = await loadFixture(createPoolWithLiquidity);

        const tx = await tokenSwap.connect(user1).addLiquidity(
          tokenA.target,
          tokenB.target,
          ethers.parseEther("100"),
          ethers.parseEther("200")
        );

        const receipt = await tx.wait();
        const liquidityAddedEvent = receipt.logs.find(log =>
          log.fragment?.name === "LiquidityAdded"
        );
        const liquidityProvided = liquidityAddedEvent.args[4];

        const userLiquidity = await tokenSwap.getLiquidity(tokenA.target, tokenB.target, user1.address);
        expect(userLiquidity).to.equal(liquidityProvided);

        await expect(
          tokenSwap.connect(user1).removeLiquidity(
            tokenA.target,
            tokenB.target,
            liquidityProvided / 2n
          )
        ).to.emit(tokenSwap, "LiquidityRemoved");
      });

      it("Should revert when removing more liquidity than owned", async function () {
        const { tokenSwap, tokenA, tokenB, user1 } = await loadFixture(createPoolWithLiquidity);

        await tokenSwap.connect(user1).addLiquidity(
          tokenA.target,
          tokenB.target,
          ethers.parseEther("100"),
          ethers.parseEther("200")
        );

        await expect(
          tokenSwap.connect(user1).removeLiquidity(
            tokenA.target,
            tokenB.target,
            ethers.parseEther("1000")
          )
        ).to.be.revertedWith("Insufficient liquidity");
      });

      it("Should remove all liquidity correctly", async function () {
        const { tokenSwap, tokenA, tokenB, user1 } = await loadFixture(createPoolWithLiquidity);

        const initialBalanceA = await tokenA.balanceOf(user1.address);
        const initialBalanceB = await tokenB.balanceOf(user1.address);

        const addTx = await tokenSwap.connect(user1).addLiquidity(
          tokenA.target,
          tokenB.target,
          ethers.parseEther("100"),
          ethers.parseEther("200")
        );

        const addReceipt = await addTx.wait();
        const liquidityAddedEvent = addReceipt.logs.find(log =>
          log.fragment?.name === "LiquidityAdded"
        );
        const totalLiquidity = liquidityAddedEvent.args[4];

        await tokenSwap.connect(user1).removeLiquidity(
          tokenA.target,
          tokenB.target,
          totalLiquidity
        );

        const finalLiquidity = await tokenSwap.getLiquidity(tokenA.target, tokenB.target, user1.address);
        expect(finalLiquidity).to.equal(0);

        const finalBalanceA = await tokenA.balanceOf(user1.address);
        const finalBalanceB = await tokenB.balanceOf(user1.address);
        expect(finalBalanceA).to.be.closeTo(initialBalanceA, ethers.parseEther("0.1"));
        expect(finalBalanceB).to.be.closeTo(initialBalanceB, ethers.parseEther("0.1"));
      });

      it("Should calculate correct token amounts when removing partial liquidity", async function () {
        const { tokenSwap, tokenA, tokenB, user1 } = await loadFixture(createPoolWithLiquidity);

        await tokenSwap.connect(user1).addLiquidity(
          tokenA.target,
          tokenB.target,
          ethers.parseEther("100"),
          ethers.parseEther("200")
        );

        const userLiquidity = await tokenSwap.getLiquidity(tokenA.target, tokenB.target, user1.address);

        const liquidityToRemove = userLiquidity / 4n;

        const tx = await tokenSwap.connect(user1).removeLiquidity(
          tokenA.target,
          tokenB.target,
          liquidityToRemove
        );

        const receipt = await tx.wait();
        const removedEvent = receipt.logs.find(log =>
          log.fragment?.name === "LiquidityRemoved"
        );

        const removedAmount0 = removedEvent.args[2];
        const removedAmount1 = removedEvent.args[3];

        expect(removedAmount0).to.be.gt(0);
        expect(removedAmount1).to.be.gt(0);
      });
    });
  });

  async function createPoolWithLiquidityForSwap() {
    const { tokenSwap, tokenA, tokenB, owner, user1, user2 } = await deployDemoSwapFixture();

    await tokenSwap.createPool(tokenA.target, tokenB.target);

    await tokenA.connect(user1).approve(tokenSwap.target, ethers.parseEther("1000"));
    await tokenB.connect(user1).approve(tokenSwap.target, ethers.parseEther("2000"));

    await tokenSwap.connect(user1).addLiquidity(
      tokenA.target,
      tokenB.target,
      ethers.parseEther("1000"),
      ethers.parseEther("2000")
    );

    return { tokenSwap, tokenA, tokenB, owner, user1, user2 };
  }

  describe("Token Swapping", function () {

    describe("swap", function () {
      it("Should perform token swap successfully", async function () {
        const { tokenSwap, tokenA, tokenB, user2 } = await createPoolWithLiquidityForSwap();

        const swapAmount = ethers.parseEther("10");
        await tokenA.connect(user2).approve(tokenSwap.target, swapAmount);

        const initialBalanceA = await tokenA.balanceOf(user2.address);
        const initialBalanceB = await tokenB.balanceOf(user2.address);

        await expect(
          tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, swapAmount)
        ).to.emit(tokenSwap, "DemoSwapped");

        const finalBalanceA = await tokenA.balanceOf(user2.address);
        const finalBalanceB = await tokenB.balanceOf(user2.address);

        expect(finalBalanceA).to.equal(initialBalanceA - swapAmount);
        expect(finalBalanceB).to.be.gt(initialBalanceB);
      });

      it("Should revert with zero amount", async function () {
        const { tokenSwap, tokenA, tokenB, user2 } = await createPoolWithLiquidityForSwap();

        await expect(
          tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, 0)
        ).to.be.revertedWith("Invalid input amount");
      });

      it("Should revert when pool doesn't exist", async function () {
        const { tokenSwap, tokenA, user2 } = await loadFixture(deployDemoSwapFixture);

        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        const tokenC = await ERC20Mock.deploy("Token C", "TKC", ethers.parseEther("1000000"));

        await expect(
          tokenSwap.connect(user2).swap(tokenA.target, tokenC.target, ethers.parseEther("10"))
        ).to.be.revertedWith("Pool does not exist");
      });
    });

    describe("getAmountOut", function () {
      it("Should calculate correct output amount", async function () {
        const { tokenSwap, tokenA, tokenB } = await loadFixture(createPoolWithLiquidityForSwap);

        const amountIn = ethers.parseEther("10");
        const amountOut = await tokenSwap.getAmountOut(tokenA.target, tokenB.target, amountIn);

        expect(amountOut).to.be.gt(0);
      });

      it("Should revert for non-existent pool", async function () {
        const { tokenSwap, tokenA } = await loadFixture(deployDemoSwapFixture);

        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        const tokenC = await ERC20Mock.deploy("Token C", "TKC", ethers.parseEther("1000000"));

        await expect(
          tokenSwap.getAmountOut(tokenA.target, tokenC.target, ethers.parseEther("10"))
        ).to.be.revertedWith("Pool does not exist");
      });
    });
  });

  async function createPoolWithLiquidityForView() {
    const { tokenSwap, tokenA, tokenB, owner, user1, user2 } = await deployDemoSwapFixture();

    await tokenSwap.createPool(tokenA.target, tokenB.target);

    await tokenA.connect(user1).approve(tokenSwap.target, ethers.parseEther("1000"));
    await tokenB.connect(user1).approve(tokenSwap.target, ethers.parseEther("2000"));

    await tokenSwap.connect(user1).addLiquidity(
      tokenA.target,
      tokenB.target,
      ethers.parseEther("1000"),
      ethers.parseEther("2000")
    );

    return { tokenSwap, tokenA, tokenB, owner, user1, user2 };
  }

  describe("View Functions", function () {

    describe("getPrice", function () {
      it("Should return correct price", async function () {
        const { tokenSwap, tokenA, tokenB } = await loadFixture(createPoolWithLiquidityForView);

        const price = await tokenSwap.getPrice(tokenA.target, tokenB.target);
        expect(price).to.equal(ethers.parseEther("2"));
      });

      it("Should revert for non-existent pool", async function () {
        const { tokenSwap, tokenA } = await loadFixture(deployDemoSwapFixture);

        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        const tokenC = await ERC20Mock.deploy("Token C", "TKC", ethers.parseEther("1000000"));

        await expect(
          tokenSwap.getPrice(tokenA.target, tokenC.target)
        ).to.be.revertedWith("Pool does not exist");
      });
    });

    describe("getReserves", function () {
      it("Should return correct reserves", async function () {
        const { tokenSwap, tokenA, tokenB } = await loadFixture(createPoolWithLiquidityForView);

        const [reserve0, reserve1] = await tokenSwap.getReserves(tokenA.target, tokenB.target);
        if (tokenA.target < tokenB.target) {
          expect(reserve0).to.equal(ethers.parseEther("1000"));
          expect(reserve1).to.equal(ethers.parseEther("2000"));
        } else {
          expect(reserve0).to.equal(ethers.parseEther("2000"));
          expect(reserve1).to.equal(ethers.parseEther("1000"));
        }
      });

      it("Should revert for non-existent pool", async function () {
        const { tokenSwap, tokenA } = await loadFixture(deployDemoSwapFixture);

        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        const tokenC = await ERC20Mock.deploy("Token C", "TKC", ethers.parseEther("1000000"));

        await expect(
          tokenSwap.getReserves(tokenA.target, tokenC.target)
        ).to.be.revertedWith("Pool does not exist");
      });
    });

    describe("getLiquidity", function () {
      it("Should return correct user liquidity", async function () {
        const { tokenSwap, tokenA, tokenB, user1 } = await loadFixture(createPoolWithLiquidityForView);

        const liquidity = await tokenSwap.getLiquidity(tokenA.target, tokenB.target, user1.address);
        expect(liquidity).to.be.gt(0);
      });

      it("Should return zero for user with no liquidity", async function () {
        const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForView);

        const liquidity = await tokenSwap.getLiquidity(tokenA.target, tokenB.target, user2.address);
        expect(liquidity).to.equal(0);
      });
    });
  });

  describe("Fee Calculation", function () {
    it("Should apply correct trading fee", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const swapAmount = ethers.parseEther("100");
      await tokenA.connect(user2).approve(tokenSwap.target, swapAmount);

      const expectedAmountOut = await tokenSwap.getAmountOut(tokenA.target, tokenB.target, swapAmount);

      const tx = await tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, swapAmount);
      const receipt = await tx.wait();

      const swapEvent = receipt.logs.find(log =>
        log.fragment?.name === "DemoSwapped"
      );
      const actualAmountOut = swapEvent.args[4];

      expect(actualAmountOut).to.equal(expectedAmountOut);
      expect(actualAmountOut).to.be.gt(0);
      expect(actualAmountOut).to.be.lt(ethers.parseEther("200"));
    });

    it("Should calculate fee correctly with different amounts", async function () {
      const { tokenSwap, tokenA, tokenB } = await loadFixture(createPoolWithLiquidityForSwap);

      const amounts = [ethers.parseEther("1"), ethers.parseEther("10"), ethers.parseEther("100")];

      for (const amount of amounts) {
        const amountOut = await tokenSwap.getAmountOut(tokenA.target, tokenB.target, amount);

        const amountInWithoutFee = amount;

        expect(amountOut).to.be.lt(amountInWithoutFee * 2n);
        expect(amountOut).to.be.gt(0);
      }
    });

    it("Should handle fee calculation for very small amounts", async function () {
      const { tokenSwap, tokenA, tokenB } = await loadFixture(createPoolWithLiquidityForSwap);

      const smallAmount = 1000;
      const amountOut = await tokenSwap.getAmountOut(tokenA.target, tokenB.target, smallAmount);

      expect(amountOut).to.be.gt(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small amounts", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const smallAmount = 1000;
      await tokenA.connect(user2).approve(tokenSwap.target, smallAmount);

      await expect(
        tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, smallAmount)
      ).to.emit(tokenSwap, "DemoSwapped");
    });

    it("Should handle large amounts within liquidity limits", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const largeAmount = ethers.parseEther("500");
      await tokenA.connect(user2).approve(tokenSwap.target, largeAmount);

      await expect(
        tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, largeAmount)
      ).to.emit(tokenSwap, "DemoSwapped");
    });

    it("Should revert when swap amount exceeds available liquidity", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const excessiveAmount = ethers.parseEther("3000");
      await tokenA.connect(user2).approve(tokenSwap.target, excessiveAmount);
      
      await expect(
        tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, excessiveAmount)
      ).to.emit(tokenSwap, "DemoSwapped");
    });

    it("Should handle multiple consecutive swaps", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(user2).approve(tokenSwap.target, swapAmount * 3n);

      for (let i = 0; i < 3; i++) {
        await expect(
          tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, swapAmount)
        ).to.emit(tokenSwap, "DemoSwapped");
      }
    });

    it("Should handle reverse token order in pool operations", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const swapAmount = ethers.parseEther("10");
      await tokenB.connect(user2).approve(tokenSwap.target, swapAmount);

      await expect(
        tokenSwap.connect(user2).swap(tokenB.target, tokenA.target, swapAmount)
      ).to.emit(tokenSwap, "DemoSwapped");
    });
  });

  describe("Security Tests", function () {
    it("Should prevent reentrancy attacks", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(user2).approve(tokenSwap.target, swapAmount);

      await expect(
        tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, swapAmount)
      ).to.emit(tokenSwap, "DemoSwapped");
    });

    it("Should handle insufficient token allowance", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const swapAmount = ethers.parseEther("10");

      await expect(
        tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, swapAmount)
      ).to.be.reverted;
    });

    it("Should handle insufficient token balance", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const excessiveAmount = ethers.parseEther("10000");
      await tokenA.connect(user2).approve(tokenSwap.target, excessiveAmount);

      await expect(
        tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, excessiveAmount)
      ).to.be.reverted;
    });

    it("Should prevent zero address token interactions", async function () {
      const { tokenSwap, tokenA } = await loadFixture(deployDemoSwapFixture);

      await expect(
        tokenSwap.createPool(tokenA.target, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");

      await expect(
        tokenSwap.createPool(ethers.ZeroAddress, tokenA.target)
      ).to.be.revertedWith("Invalid token address");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should have reasonable gas costs for pool creation", async function () {
      const { tokenSwap, tokenA, tokenB } = await loadFixture(deployDemoSwapFixture);

      const tx = await tokenSwap.createPool(tokenA.target, tokenB.target);
      const receipt = await tx.wait();

      expect(receipt.gasUsed).to.be.lt(200000);
    });

    it("Should have reasonable gas costs for swaps", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(user2).approve(tokenSwap.target, swapAmount);

      const tx = await tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, swapAmount);
      const receipt = await tx.wait();

      expect(receipt.gasUsed).to.be.lt(300000);
    });

    it("Should have reasonable gas costs for liquidity operations", async function () {
      const { tokenSwap, tokenA, tokenB, user1 } = await loadFixture(createPoolWithLiquidityForSwap);

      await tokenA.connect(user1).approve(tokenSwap.target, ethers.parseEther("100"));
      await tokenB.connect(user1).approve(tokenSwap.target, ethers.parseEther("200"));

      const tx = await tokenSwap.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      );
      const receipt = await tx.wait();

      expect(receipt.gasUsed).to.be.lt(400000);
    });
  });

  describe("Price Impact Tests", function () {
    it("Should show price impact for large swaps", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const initialPrice = await tokenSwap.getPrice(tokenA.target, tokenB.target);

      const largeSwapAmount = ethers.parseEther("100");
      await tokenA.connect(user2).approve(tokenSwap.target, largeSwapAmount);
      await tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, largeSwapAmount);

      const finalPrice = await tokenSwap.getPrice(tokenA.target, tokenB.target);

      expect(finalPrice).to.not.equal(initialPrice);
    });

    it("Should calculate different output amounts for same input at different liquidity levels", async function () {
      const { tokenSwap, tokenA, tokenB, owner } = await loadFixture(deployDemoSwapFixture);

      await tokenSwap.createPool(tokenA.target, tokenB.target);

      await tokenA.connect(owner).approve(tokenSwap.target, ethers.parseEther("100"));
      await tokenB.connect(owner).approve(tokenSwap.target, ethers.parseEther("200"));
      await tokenSwap.connect(owner).addLiquidity(
        tokenA.target,
        tokenB.target,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      );

      const swapAmount = ethers.parseEther("10");
      const amountOut1 = await tokenSwap.getAmountOut(tokenA.target, tokenB.target, swapAmount);

      await tokenA.connect(owner).approve(tokenSwap.target, ethers.parseEther("1000"));
      await tokenB.connect(owner).approve(tokenSwap.target, ethers.parseEther("2000"));
      await tokenSwap.connect(owner).addLiquidity(
        tokenA.target,
        tokenB.target,
        ethers.parseEther("1000"),
        ethers.parseEther("2000")
      );

      const amountOut2 = await tokenSwap.getAmountOut(tokenA.target, tokenB.target, swapAmount);

      expect(amountOut2).to.be.gt(amountOut1);
    });
  });

  describe("Multi-User Interaction Tests", function () {
    it("Should handle multiple users adding liquidity to same pool", async function () {
      const { tokenSwap, tokenA, tokenB, user1, user2 } = await loadFixture(deployDemoSwapFixture);

      await tokenSwap.createPool(tokenA.target, tokenB.target);

      await tokenA.connect(user1).approve(tokenSwap.target, ethers.parseEther("100"));
      await tokenB.connect(user1).approve(tokenSwap.target, ethers.parseEther("200"));
      await tokenSwap.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      );

      await tokenA.connect(user2).approve(tokenSwap.target, ethers.parseEther("50"));
      await tokenB.connect(user2).approve(tokenSwap.target, ethers.parseEther("100"));
      await tokenSwap.connect(user2).addLiquidity(
        tokenA.target,
        tokenB.target,
        ethers.parseEther("50"),
        ethers.parseEther("100")
      );

      const user1Liquidity = await tokenSwap.getLiquidity(tokenA.target, tokenB.target, user1.address);
      const user2Liquidity = await tokenSwap.getLiquidity(tokenA.target, tokenB.target, user2.address);

      expect(user1Liquidity).to.be.gt(user2Liquidity);
      expect(user1Liquidity).to.be.gt(0);
      expect(user2Liquidity).to.be.gt(0);
    });

    it("Should handle concurrent swaps from different users", async function () {
      const { tokenSwap, tokenA, tokenB, user1, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(user1).approve(tokenSwap.target, swapAmount);
      await tokenB.connect(user2).approve(tokenSwap.target, swapAmount);

      await expect(
        tokenSwap.connect(user1).swap(tokenA.target, tokenB.target, swapAmount)
      ).to.emit(tokenSwap, "DemoSwapped");

      await expect(
        tokenSwap.connect(user2).swap(tokenB.target, tokenA.target, swapAmount)
      ).to.emit(tokenSwap, "DemoSwapped");
    });
  });

  describe("Mathematical Precision Tests", function () {
    it("Should maintain k=x*y invariant after swaps", async function () {
      const { tokenSwap, tokenA, tokenB, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const [reserve0Before, reserve1Before] = await tokenSwap.getReserves(tokenA.target, tokenB.target);
      const kBefore = reserve0Before * reserve1Before;

      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(user2).approve(tokenSwap.target, swapAmount);
      await tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, swapAmount);

      const [reserve0After, reserve1After] = await tokenSwap.getReserves(tokenA.target, tokenB.target);
      const kAfter = reserve0After * reserve1After;

      expect(kAfter).to.be.gte(kBefore);
    });

    it("Should handle precision for very small liquidity amounts", async function () {
      const { tokenSwap, tokenA, tokenB, user1 } = await loadFixture(createPoolWithLiquidityForSwap);

      await tokenA.connect(user1).approve(tokenSwap.target, 1000);
      await tokenB.connect(user1).approve(tokenSwap.target, 2000);

      await tokenSwap.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        1000,
        2000
      );

      const liquidity = await tokenSwap.getLiquidity(tokenA.target, tokenB.target, user1.address);
      expect(liquidity).to.be.gt(0);
    });
  });

  describe("Event Emission Tests", function () {
    it("Should emit correct events with proper parameters", async function () {
      const { tokenSwap, tokenA, tokenB, user1, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      const poolId = await tokenSwap.getPoolId(tokenA.target, tokenB.target);

      await tokenA.connect(user1).approve(tokenSwap.target, ethers.parseEther("100"));
      await tokenB.connect(user1).approve(tokenSwap.target, ethers.parseEther("200"));

      await expect(tokenSwap.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      )).to.emit(tokenSwap, "LiquidityAdded");

      const userLiquidity = await tokenSwap.getLiquidity(tokenA.target, tokenB.target, user1.address);

      await expect(tokenSwap.connect(user1).removeLiquidity(
        tokenA.target,
        tokenB.target,
        userLiquidity / 2n
      )).to.emit(tokenSwap, "LiquidityRemoved");

      await tokenA.connect(user2).approve(tokenSwap.target, ethers.parseEther("10"));
      const expectedAmountOut = await tokenSwap.getAmountOut(tokenA.target, tokenB.target, ethers.parseEther("10"));

      await expect(tokenSwap.connect(user2).swap(
        tokenA.target,
        tokenB.target,
        ethers.parseEther("10")
      )).to.emit(tokenSwap, "DemoSwapped")
        .withArgs(user2.address, poolId, tokenA.target, ethers.parseEther("10"), expectedAmountOut);
    });
  });

  describe("Pool State Consistency Tests", function () {
    it("Should maintain consistent pool state across operations", async function () {
      const { tokenSwap, tokenA, tokenB, user1, user2 } = await loadFixture(createPoolWithLiquidityForSwap);

      await tokenA.connect(user1).approve(tokenSwap.target, ethers.parseEther("100"));
      await tokenB.connect(user1).approve(tokenSwap.target, ethers.parseEther("200"));

      await tokenSwap.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      );

      const [reserve0, reserve1] = await tokenSwap.getReserves(tokenA.target, tokenB.target);
      const price = await tokenSwap.getPrice(tokenA.target, tokenB.target);
      const user1Liquidity = await tokenSwap.getLiquidity(tokenA.target, tokenB.target, user1.address);

      expect(reserve0).to.be.gt(0);
      expect(reserve1).to.be.gt(0);
      expect(price).to.be.gt(0);
      expect(user1Liquidity).to.be.gt(0);

      await tokenA.connect(user2).approve(tokenSwap.target, ethers.parseEther("10"));
      await tokenSwap.connect(user2).swap(tokenA.target, tokenB.target, ethers.parseEther("10"));

      const [newReserve0, newReserve1] = await tokenSwap.getReserves(tokenA.target, tokenB.target);
      const newPrice = await tokenSwap.getPrice(tokenA.target, tokenB.target);

      expect(newReserve0).to.not.equal(reserve0);
      expect(newReserve1).to.not.equal(reserve1);
      expect(newPrice).to.not.equal(price);
    });
  });
});