// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DemoSwap
 * @dev ERC20 token swap contract with AMM (Automated Market Maker) functionality
 */
contract DemoSwap {
    // Structure to store liquidity pool information
    struct LiquidityPool {
        uint256 token0Reserve;
        uint256 token1Reserve;
        uint256 totalLiquidity;
        mapping(address => uint256) liquidity;
        bool exists;
    }
    
    // Mapping to store liquidity pools
    mapping(bytes32 => LiquidityPool) public pools;
    
    // Trading fee (0.3%)
    uint256 public constant FEE_PERCENTAGE = 3;
    uint256 public constant FEE_DENOMINATOR = 1000;
    
    // Events
    event PoolCreated(address indexed token0, address indexed token1, bytes32 poolId);
    event LiquidityAdded(address indexed provider, bytes32 poolId, uint256 amount0, uint256 amount1, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, bytes32 poolId, uint256 amount0, uint256 amount1, uint256 liquidity);
    event DemoSwapped(address indexed user, bytes32 poolId, address tokenIn, uint256 amountIn, uint256 amountOut);
    
    // Modifiers
    modifier poolExists(bytes32 poolId) {
        require(pools[poolId].exists, "Pool does not exist");
        _;
    }
    
    /**
     * @dev Generate pool ID from 2 token addresses
     */
    function getPoolId(address token0, address token1) public pure returns (bytes32) {
        require(token0 != token1, "Identical tokens");
        (address t0, address t1) = token0 < token1 ? (token0, token1) : (token1, token0);
        return keccak256(abi.encodePacked(t0, t1));
    }
    
    /**
     * @dev Create a new liquidity pool
     */
    function createPool(address token0, address token1) external returns (bytes32 poolId) {
        require(token0 != address(0) && token1 != address(0), "Invalid token address");
        
        poolId = getPoolId(token0, token1);
        require(!pools[poolId].exists, "Pool already exists");
        
        pools[poolId].exists = true;
        
        emit PoolCreated(token0, token1, poolId);
    }
    
    /**
     * @dev Add liquidity to the pool
     */
    function addLiquidity(
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired
    ) external poolExists(getPoolId(token0, token1)) returns (uint256 liquidity) {
        bytes32 poolId = getPoolId(token0, token1);
        LiquidityPool storage pool = pools[poolId];
        
        uint256 amount0;
        uint256 amount1;
        
        if (pool.totalLiquidity == 0) {
            // New pool, accept any ratio
            amount0 = amount0Desired;
            amount1 = amount1Desired;
            liquidity = sqrt(amount0 * amount1);
            pool.totalLiquidity = liquidity;
        } else {
            // Calculate required token amounts based on current ratio
            uint256 amount1Optimal = (amount0Desired * pool.token1Reserve) / pool.token0Reserve;
            
            if (amount1Optimal <= amount1Desired) {
                amount0 = amount0Desired;
                amount1 = amount1Optimal;
            } else {
                uint256 amount0Optimal = (amount1Desired * pool.token0Reserve) / pool.token1Reserve;
                require(amount0Optimal <= amount0Desired, "Insufficient amount");
                amount0 = amount0Optimal;
                amount1 = amount1Desired;
            }
            
            liquidity = min(
                (amount0 * pool.totalLiquidity) / pool.token0Reserve,
                (amount1 * pool.totalLiquidity) / pool.token1Reserve
            );
            pool.totalLiquidity += liquidity;
        }
        
        // Transfer tokens from user to contract
        require(IERC20(token0).transferFrom(msg.sender, address(this), amount0), "Transfer token0 failed");
        require(IERC20(token1).transferFrom(msg.sender, address(this), amount1), "Transfer token1 failed");
        
        // Update reserves and liquidity
        pool.token0Reserve += amount0;
        pool.token1Reserve += amount1;
        pool.liquidity[msg.sender] += liquidity;
        
        emit LiquidityAdded(msg.sender, poolId, amount0, amount1, liquidity);
    }
    
    /**
     * @dev Remove liquidity from the pool
     */
    function removeLiquidity(
        address token0,
        address token1,
        uint256 liquidity
    ) external poolExists(getPoolId(token0, token1)) returns (uint256 amount0, uint256 amount1) {
        bytes32 poolId = getPoolId(token0, token1);
        LiquidityPool storage pool = pools[poolId];
        
        require(pool.liquidity[msg.sender] >= liquidity, "Insufficient liquidity");
        
        // Calculate the amount of tokens to be received
        amount0 = (liquidity * pool.token0Reserve) / pool.totalLiquidity;
        amount1 = (liquidity * pool.token1Reserve) / pool.totalLiquidity;
        
        // Update pool
        pool.liquidity[msg.sender] -= liquidity;
        pool.totalLiquidity -= liquidity;
        pool.token0Reserve -= amount0;
        pool.token1Reserve -= amount1;
        
        // Transfer tokens to user
        require(IERC20(token0).transfer(msg.sender, amount0), "Transfer token0 failed");
        require(IERC20(token1).transfer(msg.sender, amount1), "Transfer token1 failed");
        
        emit LiquidityRemoved(msg.sender, poolId, amount0, amount1, liquidity);
    }
    
    /**
     * @dev Swap tokens
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external poolExists(getPoolId(tokenIn, tokenOut)) returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid input amount");
        
        bytes32 poolId = getPoolId(tokenIn, tokenOut);
        LiquidityPool storage pool = pools[poolId];
        
        // Determine which token is token0 and which is token1
        bool isToken0In = tokenIn < tokenOut;
        
        uint256 reserveIn = isToken0In ? pool.token0Reserve : pool.token1Reserve;
        uint256 reserveOut = isToken0In ? pool.token1Reserve : pool.token0Reserve;
        
        // Calculate fee
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_PERCENTAGE);
        
        // Calculate output based on x * y = k formula
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
        
        require(amountOut > 0, "Insufficient output amount");
        
        // Transfer tokens from user to contract
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "Transfer tokenIn failed");
        
        // Transfer tokens to user
        require(IERC20(tokenOut).transfer(msg.sender, amountOut), "Transfer tokenOut failed");
        
        // Update reserves
        if (isToken0In) {
            pool.token0Reserve += amountIn;
            pool.token1Reserve -= amountOut;
        } else {
            pool.token1Reserve += amountIn;
            pool.token0Reserve -= amountOut;
        }
        
        emit DemoSwapped(msg.sender, poolId, tokenIn, amountIn, amountOut);
    }
    
    /**
     * @dev Get the relative price between 2 tokens
     */
    function getPrice(address token0, address token1) external view returns (uint256 price) {
        bytes32 poolId = getPoolId(token0, token1);
        require(pools[poolId].exists, "Pool does not exist");
        
        LiquidityPool storage pool = pools[poolId];
        require(pool.token0Reserve > 0 && pool.token1Reserve > 0, "Insufficient liquidity");
        
        // Price of token0 in terms of token1
        price = (pool.token1Reserve * 1e18) / pool.token0Reserve;
    }
    
    /**
     * @dev Calculate output token amount for a swap
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        bytes32 poolId = getPoolId(tokenIn, tokenOut);
        require(pools[poolId].exists, "Pool does not exist");
        
        LiquidityPool storage pool = pools[poolId];
        bool isToken0In = tokenIn < tokenOut;
        
        uint256 reserveIn = isToken0In ? pool.token0Reserve : pool.token1Reserve;
        uint256 reserveOut = isToken0In ? pool.token1Reserve : pool.token0Reserve;
        
        require(amountIn > 0, "Invalid input amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_PERCENTAGE);
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }
    
    /**
     * @dev Get pool reserves information
     */
    function getReserves(address token0, address token1) external view returns (uint256 reserve0, uint256 reserve1) {
        bytes32 poolId = getPoolId(token0, token1);
        require(pools[poolId].exists, "Pool does not exist");
        
        LiquidityPool storage pool = pools[poolId];
        if (token0 < token1) {
            reserve0 = pool.token0Reserve;
            reserve1 = pool.token1Reserve;
        } else {
            reserve0 = pool.token1Reserve;
            reserve1 = pool.token0Reserve;
        }
    }
    
    /**
     * @dev Get the liquidity amount of a user
     */
    function getLiquidity(address token0, address token1, address provider) external view returns (uint256) {
        bytes32 poolId = getPoolId(token0, token1);
        return pools[poolId].liquidity[provider];
    }
    
    // Utility functions
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
