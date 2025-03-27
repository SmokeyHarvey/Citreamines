import React, { useState } from "react";
import { motion } from "framer-motion";

interface GameState {
  grid: string[];
  revealed: boolean[];
  gameOver: boolean;
  earnings: number;
  stake: number;
  payout: number;
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
  const [gameState, setGameState] = useState<GameState>({
    grid: generateGrid(3),
    revealed: Array(25).fill(false),
    gameOver: false,
    earnings: 0,
    stake: 0.005,
    payout: 1.2
  });

  const [selectedBet, setSelectedBet] = useState<number>(0.005);
  const [remainingLemons, setRemainingLemons] = useState<number>(22);
  const [balance, setBalance] = useState<number>(1000); // Starting balance

  const revealTile = (index: number) => {
    if (gameState.gameOver || gameState.revealed[index]) return;
    
    let newRevealed = [...gameState.revealed];
    newRevealed[index] = true;
    
    let newEarnings = gameState.earnings;
    let newGameOver = false;
    let newRemainingLemons = remainingLemons;
    
    if (gameState.grid[index] === "bomb") {
      newGameOver = true;
      newEarnings = 0;
      // No need to deduct balance here as it's already deducted when starting the game
    } else {
      newRemainingLemons--;
      // Calculate reward based on progress and bet amount
      const progressMultiplier = 1 + ((25 - newRemainingLemons) / 25);
      newEarnings = gameState.stake * gameState.payout * progressMultiplier;
      
      if (newRemainingLemons === 0) {
        // Add the full reward when all lemons are found
        setBalance(prev => prev + newEarnings);
      }
    }

    setRemainingLemons(newRemainingLemons);
    setGameState({
      ...gameState,
      revealed: newRevealed,
      gameOver: newGameOver,
      earnings: newEarnings,
    });
  };

  const startNewGame = () => {
    // Check if player has enough balance for the selected bet
    if (balance < selectedBet) {
      alert("Insufficient balance for this bet amount!");
      return;
    }

    // Deduct the bet amount when starting a new game
    setBalance(prev => prev - selectedBet);

    const { mines, multiplier } = calculateDifficulty(selectedBet);
    setGameState({
      grid: generateGrid(mines),
      revealed: Array(25).fill(false),
      gameOver: false,
      earnings: 0,
      stake: selectedBet,
      payout: multiplier
    });
    setRemainingLemons(25 - mines);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ff5005] to-[#f79c11] text-gray-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Game Info */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Lemon Miner</h2>
            <button 
              onClick={startNewGame}
              className="px-4 py-2 bg-gradient-to-r from-[#ff5005] to-[#f79c11] text-white rounded-md hover:opacity-90 transition-opacity"
            >
              New Game
            </button>
          </div>

          {/* Bet Selection */}
          <div className="grid grid-cols-5 gap-2">
            {BET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => setSelectedBet(amount)}
                className={`p-2 rounded-md text-center transition-all ${
                  selectedBet === amount 
                    ? 'bg-gradient-to-r from-[#ff5005] to-[#f79c11] text-white shadow-md' 
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                {amount} CBTC
              </button>
            ))}
          </div>

          {/* Game Stats */}
          <div className="grid grid-cols-4 gap-6 pt-2">
            <div>
              <div className="text-sm text-gray-500 mb-1">Current Bet</div>
              <div className="flex items-center gap-1 font-mono">
                {gameState.stake} CBTC
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Multiplier</div>
              <div className="font-mono">{gameState.payout.toFixed(1)}×</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Balance</div>
              <div className="flex items-center gap-1 text-green-500 font-mono">
                {balance.toFixed(4)} CBTC
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Current Profit</div>
              <div className={`flex items-center gap-1 font-mono ${
                gameState.earnings > 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {gameState.earnings > 0 ? '+' : ''}{gameState.earnings.toFixed(4)} CBTC
              </div>
            </div>
          </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-5 gap-2">
          {gameState.grid.map((item, index) => (
            <motion.button
              key={index}
              onClick={() => revealTile(index)}
              disabled={gameState.revealed[index] || gameState.gameOver}
              className="aspect-square bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center justify-center hover:bg-white/100 transition-all disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {gameState.revealed[index] ? (
                <motion.img 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  src={item === "bomb" ? "/mine.svg" : "/lemon.svg"} 
                  alt={item} 
                  className="w-4/5 h-4/5 object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gray-100/50 rounded-lg" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Game Status */}
        {gameState.gameOver && (
          <div className="bg-red-100/90 backdrop-blur-sm text-red-700 p-4 rounded-lg text-center font-semibold shadow-lg">
            Game Over! You hit a mine and lost your bet.
          </div>
        )}
        
        {!gameState.gameOver && gameState.earnings > 0 && (
          <div className="bg-green-100/90 backdrop-blur-sm text-green-700 p-4 rounded-lg text-center shadow-lg">
            <div className="font-semibold">Current Progress</div>
            <div>{remainingLemons} lemons remaining</div>
            <div>Potential win: {gameState.earnings.toFixed(4)} CBTC</div>
          </div>
        )}
      </div>
    </div>
  );
}