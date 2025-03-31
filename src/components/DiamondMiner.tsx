import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWeb3 } from "../contexts/Web3Context";
import { ethers } from "ethers";

interface GameState {
  grid: string[];
  revealed: boolean[];
  gameOver: boolean;
  earnings: number;
  stake: number;
  payout: number;
  isActive: boolean;
}

interface PlayerStats {
  totalGames: bigint;
  totalWins: bigint;
  totalLosses: bigint;
  totalEarnings: bigint;
}

interface ActiveGame {
  betAmount: bigint;
  startTime: bigint;
  isComplete: boolean;
  hasWon: boolean;
  earnings: bigint;
}

const BET_AMOUNTS = [0.005, 0.01, 0.05, 0.1, 1];

const calculateDifficulty = (stake: number): { mines: number, multiplier: number } => {
  // Increase difficulty (mines) and reward (multiplier) based on stake
  switch(stake) {
    case 0.005:
      return { mines: 3, multiplier: 1.2 };
    case 0.01:
      return { mines: 4, multiplier: 1.5 };
    case 0.05:
      return { mines: 5, multiplier: 2.0 };
    case 0.1:
      return { mines: 6, multiplier: 2.5 };
    case 1:
      return { mines: 8, multiplier: 3.0 };
    default:
      return { mines: 3, multiplier: 1.2 };
  }
};

const generateGrid = (totalMines: number): string[] => {
  const gridSize = 5;
  let grid = Array(gridSize * gridSize).fill("lemon");
  let bombIndices = new Set<number>();
  
  while (bombIndices.size < totalMines) {
    bombIndices.add(Math.floor(Math.random() * (gridSize * gridSize)));
  }
  bombIndices.forEach((index) => (grid[index] = "bomb"));
  return grid;
};

export default function DiamondMiner() {
  const { account, contract, provider, connect, disconnect } = useWeb3();
  const [gameState, setGameState] = useState<GameState>({
    grid: generateGrid(3),
    revealed: Array(25).fill(false),
    gameOver: false,
    earnings: 0,
    stake: 0.005,
    payout: 1.2,
    isActive: false
  });

  const [selectedBet, setSelectedBet] = useState<number>(0.005);
  const [remainingLemons, setRemainingLemons] = useState<number>(22);
  const [balance, setBalance] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset all states when account changes
  useEffect(() => {
    if (!account) {
      setActiveGame(null);
      setGameState({
        grid: generateGrid(3),
        revealed: Array(25).fill(false),
        gameOver: false,
        earnings: 0,
        stake: 0.005,
        payout: 1.2,
        isActive: false
      });
      setRemainingLemons(22);
      setBalance(0);
      setWalletBalance(0);
      setPlayerStats(null);
    } else {
      // Fetch wallet balance when account is connected
      fetchWalletBalance();
    }
  }, [account]);

  useEffect(() => {
    if (contract && account) {
      loadPlayerData();
      checkActiveGame();
    }
  }, [contract, account]);

  const checkActiveGame = async () => {
    if (!contract || !account) return;
    
    try {
      const deposit = await contract.getPlayerDeposit(account);
      if (deposit > 0) {
        // If there's a deposit, there's an active game
        setActiveGame({
          betAmount: deposit,
          startTime: BigInt(Math.floor(Date.now() / 1000)),
          isComplete: false,
          hasWon: false,
          earnings: 0n
        });
        
        // Set initial game state
        const { mines, multiplier } = calculateDifficulty(Number(ethers.formatEther(deposit)));
        setGameState({
          grid: generateGrid(mines),
          revealed: Array(25).fill(false),
          gameOver: false,
          earnings: 0,
          stake: Number(ethers.formatEther(deposit)),
          payout: multiplier,
          isActive: true
        });
        setRemainingLemons(25 - mines);
      } else {
        // No active game
        setActiveGame(null);
        setGameState({
          grid: generateGrid(3),
          revealed: Array(25).fill(false),
          gameOver: false,
          earnings: 0,
          stake: 0.005,
          payout: 1.2,
          isActive: false
        });
        setRemainingLemons(22);
      }
    } catch (error) {
      console.error('Error checking active game:', error);
      setActiveGame(null);
      setGameState({
        grid: generateGrid(3),
        revealed: Array(25).fill(false),
        gameOver: false,
        earnings: 0,
        stake: 0.005,
        payout: 1.2,
        isActive: false
      });
      setRemainingLemons(22);
    }
  };

  const fetchWalletBalance = async () => {
    if (!provider || !account) return;
    
    try {
      // Get native CBTC balance
      const balance = await provider.getBalance(account);
      setWalletBalance(Number(ethers.formatEther(balance)));
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const loadPlayerData = async () => {
    if (!contract || !account) return;
    
    try {
      const stats = await contract.getPlayerStats(account) as PlayerStats;
      const gameBalance = await contract.getPlayerBalance(account) as bigint;
      setPlayerStats(stats);
      setBalance(Number(ethers.formatEther(gameBalance)));
      
      // Also refresh wallet balance
      await fetchWalletBalance();
    } catch (error) {
      console.error('Error loading player data:', error);
    }
  };

  const updateCurrentProfit = (revealedLemons: number) => {
    const totalLemons = 25 - gameState.grid.filter(cell => cell === "bomb").length;
    const profitPerLemon = gameState.stake * gameState.payout / totalLemons;
    const currentProfit = profitPerLemon * revealedLemons;
    
    setGameState(prev => ({
      ...prev,
      earnings: currentProfit
    }));
  };

  const startNewGame = async () => {
    if (!contract || !account) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if there's an active game
      const deposit = await contract.getPlayerDeposit(account);
      if (deposit > 0) {
        // If there's a deposit, try to withdraw first
        try {
          const tx = await contract.withdraw();
          await tx.wait();
        } catch (error) {
          console.error('Error withdrawing from previous game:', error);
          throw new Error('Failed to withdraw from previous game. Please try again.');
        }
      }
      
      // Start new game with selected bet amount
      const betAmount = ethers.parseEther(selectedBet.toString());
      const { mines, multiplier } = calculateDifficulty(selectedBet);
      
      console.log('Starting new game with:', {
        betAmount: ethers.formatEther(betAmount),
        mines,
        multiplier
      });
      
      const tx = await contract.startGame({ value: betAmount });
      await tx.wait();
      
      // Reset local game state with new bet amount and difficulty
      setGameState({
        grid: generateGrid(mines),
        revealed: Array(25).fill(false),
        gameOver: false,
        earnings: 0,
        stake: selectedBet,
        payout: multiplier,
        isActive: true
      });
      
      // Set remaining lemons
      setRemainingLemons(25 - mines);
      
      // Update player data
      await loadPlayerData();
      await checkActiveGame();
      
    } catch (error) {
      console.error('Error starting game:', error);
      setError(error instanceof Error ? error.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCurrentEarnings = () => {
    if (!activeGame) return 0;
    
    const betAmount = Number(ethers.formatEther(activeGame.betAmount));
    const revealedLemons = gameState.revealed.filter(r => r).length;
    
    // Calculate earnings using the same formula as the contract:
    // rewardMultiplier = 100 + (revealedLemons * 20)
    // earnings = (betAmount * rewardMultiplier) / 100
    const rewardMultiplier = 100 + (revealedLemons * 20);
    const earnings = (betAmount * rewardMultiplier) / 100;
    
    // Return profit (earnings - bet amount)
    return earnings - betAmount;
  };

  const revealTile = async (index: number) => {
    if (!contract || !account || gameState.gameOver || gameState.revealed[index] || !gameState.isActive) return;
    
    try {
      let newRevealed = [...gameState.revealed];
      newRevealed[index] = true;
      
      // Check if the tile is a bomb
      if (gameState.grid[index] === "bomb") {
        // Update local state for game over
    setGameState({
      ...gameState,
      revealed: newRevealed,
          gameOver: true,
          earnings: 0,
          isActive: false
        });
        
        // Complete game with loss on blockchain
        const tx = await contract.completeGame(false, 0);
        await tx.wait();
        await loadPlayerData();
        return;
      }

      // If it's a lemon, update the game state
      const newRemainingLemons = remainingLemons - 1;
      setRemainingLemons(newRemainingLemons);
      
      // Update revealed state and calculate current earnings
      setGameState(prev => {
        const newState = {
          ...prev,
          revealed: newRevealed,
          earnings: calculateCurrentEarnings()
        };
        return newState;
      });

      // If all lemons are revealed, complete game with win
      if (newRemainingLemons === 0) {
        const currentEarnings = calculateCurrentEarnings();
        const totalEarnings = currentEarnings + Number(ethers.formatEther(activeGame.betAmount));
        const earnings = ethers.parseEther(totalEarnings.toString());
        const tx = await contract.completeGame(true, earnings);
        await tx.wait();
        await loadPlayerData();
        setGameState(prev => ({ ...prev, isActive: false }));
      }
    } catch (error) {
      console.error('Error revealing tile:', error);
      alert("Failed to reveal tile. Please try again.");
    }
  };

  const withdraw = async () => {
    if (!contract || !account) return;
    
    try {
      setIsLoading(true);
      
      // First complete the game with current earnings
      const currentEarnings = calculateCurrentEarnings();
      const totalEarnings = currentEarnings + Number(ethers.formatEther(activeGame?.betAmount || 0n));
      const earnings = ethers.parseEther(totalEarnings.toString());
      
      console.log('Completing game with earnings:', {
        currentEarnings,
        totalEarnings,
        earnings: ethers.formatEther(earnings)
      });
      
      // Complete game first
      const completeTx = await contract.completeGame(true, earnings);
      await completeTx.wait();
      
      // Then withdraw
      const withdrawTx = await contract.withdraw();
      await withdrawTx.wait();
      
      // Reset states after successful withdrawal
      setActiveGame(null);
      setGameState({
        grid: generateGrid(3),
        revealed: Array(25).fill(false),
        gameOver: false,
        earnings: 0,
        stake: 0.005,
        payout: 1.2,
        isActive: false
      });
      
      // Update player data
      await loadPlayerData();
      
    } catch (error) {
      console.error('Error withdrawing:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("Failed to withdraw. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnect) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Reset all local states first
      setActiveGame(null);
      setGameState({
        grid: generateGrid(3),
        revealed: Array(25).fill(false),
        gameOver: false,
        earnings: 0,
        stake: 0.005,
        payout: 1.2,
        isActive: false
      });
      setRemainingLemons(22);
      setBalance(0);
      setWalletBalance(0);
      setPlayerStats(null);
      
      // Call disconnect from Web3Context and wait for it to complete
      await disconnect();
      
      // Double check that we're actually disconnected
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
          params: []
        });
        
        if (accounts && accounts.length > 0) {
          // If we're still connected, try one more time
          await window.ethereum.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }]
          });
        }
      }
      
      // Force a clean reload
      window.location.href = window.location.origin + window.location.pathname;
      
    } catch (error) {
      console.error('Error disconnecting:', error);
      setError('Failed to disconnect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ff5005] to-[#f79c11] text-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar */}
        <div className="w-full lg:w-2/5 space-y-2">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <img 
              src="/logo.svg" 
              alt="CITREA Mining" 
              className="h-28 md:h-36 w-auto object-contain"
            />
          </div>

          {/* Game Info */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 space-y-4 w-full">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-end gap-4"
            >
              <div className="flex items-center gap-4">
                {account && (
                  <div className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </div>
                )}
                <div className="flex gap-2">
                  {!account ? (
                    <button 
                      onClick={connect}
                      disabled={isLoading}
                      className="px-4 py-2 bg-gradient-to-r from-[#ff5005] to-[#f79c11] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isLoading ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={startNewGame}
                        disabled={isLoading || gameState.isActive}
                        className="px-4 py-2 bg-gradient-to-r from-[#ff5005] to-[#f79c11] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isLoading ? 'Loading...' : 'New Game'}
                      </button>
                      <button 
                        onClick={handleDisconnect}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isLoading ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Active Game Warning */}
            {activeGame?.isActive && (
              <div className="bg-yellow-100/90 backdrop-blur-sm text-yellow-700 p-4 rounded-lg text-center font-semibold shadow-lg">
                You have an active game in progress. Complete it before starting a new one.
              </div>
            )}

            {/* Player Stats */}
            {playerStats && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="text-sm text-gray-500">Games</div>
                  <div className="font-mono">{playerStats.totalGames.toString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Wins</div>
                  <div className="font-mono">{playerStats.totalWins.toString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Losses</div>
                  <div className="font-mono">{playerStats.totalLosses.toString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Earnings</div>
                  <div className="font-mono">{Number(ethers.formatEther(playerStats.totalEarnings)).toFixed(3)} CBTC</div>
                </div>
              </motion.div>
            )}

            {/* Bet Selection */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-3 sm:grid-cols-5 gap-2"
            >
              {BET_AMOUNTS.map((amount, index) => (
                <motion.button
                  key={amount}
                  onClick={() => setSelectedBet(amount)}
                  disabled={isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`p-2 rounded-md text-center transition-all ${
                    selectedBet === amount 
                      ? 'bg-gradient-to-r from-[#ff5005] to-[#f79c11] text-white shadow-md' 
                      : 'bg-white hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  {amount} CBTC
                </motion.button>
              ))}
            </motion.div>

            {/* Game Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <div>
                <div className="text-sm text-gray-500 mb-1">Current Bet</div>
                <div className="flex items-center gap-1 font-mono">
                  {gameState.stake.toFixed(3)} CBTC
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Multiplier</div>
                <div className="font-mono">{gameState.payout.toFixed(1)}×</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Wallet Balance</div>
                <div className="flex items-center gap-1 text-blue-500 font-mono">
                  {walletBalance.toFixed(3)} CBTC
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Current Profit</div>
                <div className={`flex items-center gap-1 font-mono ${
                  calculateCurrentEarnings() > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {calculateCurrentEarnings() > 0 ? '+' : ''}{calculateCurrentEarnings().toFixed(3)} CBTC
                </div>
              </div>
            </motion.div>
          </div>

          {/* Game Status */}
          {gameState.gameOver && (
            <div className="bg-red-100/90 backdrop-blur-sm text-red-700 p-4 rounded-lg text-center font-semibold shadow-lg">
              Game Over! You hit a mine and lost your bet.
              <button
                onClick={() => {
                  setSelectedBet(0.005);
                  startNewGame();
                }}
                disabled={isLoading}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-[#ff5005] to-[#f79c11] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Start New Game'}
              </button>
            </div>
          )}
          
          {!gameState.gameOver && calculateCurrentEarnings() > 0 && (
            <div className="bg-green-100/90 backdrop-blur-sm text-green-700 p-4 rounded-lg text-center shadow-lg">
              <div className="font-semibold">Current Progress</div>
              <div>{remainingLemons} lemons remaining</div>
              <div>Current profit: {calculateCurrentEarnings().toFixed(3)} CBTC</div>
              <button
                onClick={withdraw}
                disabled={isLoading}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : `Withdraw ${calculateCurrentEarnings().toFixed(3)} CBTC`}
              </button>
            </div>
          )}
        </div>

        {/* Center Game Grid */}
        <div className="w-full lg:w-3/5 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl w-full"
          >
            <div className="grid grid-cols-5 gap-4 aspect-square">
          {gameState.grid.map((item, index) => (
                <motion.button
                  key={index}
                  onClick={() => revealTile(index)}
                  disabled={gameState.revealed[index] || gameState.gameOver || isLoading}
                  className={`aspect-square rounded-lg flex items-center justify-center transition-all disabled:cursor-not-allowed ${
                    gameState.revealed[index] 
                      ? 'bg-transparent' 
                      : 'bg-white/90 backdrop-blur-sm hover:bg-white hover:shadow-xl shadow-lg'
                  }`}
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  whileTap={{ scale: 0.95 }}
                  initial={gameState.revealed[index] ? { scale: 0, rotate: -180 } : { scale: 1 }}
                  animate={gameState.revealed[index] ? { scale: 1, rotate: 0 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  {gameState.revealed[index] ? (
                    <motion.img 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      src={item === "bomb" ? "/mine.svg" : "/lemon.svg"} 
                      alt={item} 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      className="w-full h-full bg-white rounded-lg shadow-inner" 
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}