import React, { useState } from "react";
import { Button } from "./Button"; 
import { Card, CardContent } from "./Card";


const GRID_SIZE: number = 10;
const TOTAL_BOMBS: number = 10;

const TILE_SIZE = "aspect-square text-xl flex items-center justify-center border border-gray-700 bg-gray-800 hover:bg-gray-700 transition-all";

interface GameState {
  grid: string[];
  revealed: boolean[];
  gameOver: boolean;
  earnings: number;
  stake: number;
}

const generateGrid = (): string[] => {
  let grid = Array(GRID_SIZE * GRID_SIZE).fill("diamond");
  let bombIndices = new Set<number>();
  while (bombIndices.size < TOTAL_BOMBS) {
    bombIndices.add(Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE)));
  }
  bombIndices.forEach((index) => (grid[index] = "bomb"));
  return grid;
};

export default function DiamondMiner() {
  const [gameState, setGameState] = useState<GameState>({
    grid: generateGrid(),
    revealed: Array(GRID_SIZE * GRID_SIZE).fill(false),
    gameOver: false,
    earnings: 0,
    stake: 0.001,
  });

  const revealTile = (index: number) => {
    if (gameState.gameOver || gameState.revealed[index]) return;
    let newRevealed = [...gameState.revealed];
    newRevealed[index] = true;
    
    let newEarnings = gameState.earnings;
    let newGameOver: boolean = gameState.gameOver;
    
    if (gameState.grid[index] === "bomb") {
      newGameOver = true;
    } else {
      newEarnings += gameState.stake * 0.5;
    }

    setGameState({
      ...gameState,
      revealed: newRevealed,
      gameOver: newGameOver,
      earnings: newEarnings,
    });
  };

  const resetGame = () => {
    setGameState({
      grid: generateGrid(),
      revealed: Array(GRID_SIZE * GRID_SIZE).fill(false),
      gameOver: false,
      earnings: 0,
      stake: gameState.stake,
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-900 text-white min-h-screen">
      <Card className="p-4 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <p>Stake: {gameState.stake} CBTC</p>
          <Button onClick={resetGame} className="bg-red-600 hover:bg-red-700">Restart</Button>
        </div>
        <CardContent className="grid grid-cols-10 gap-2 p-4">
          {gameState.grid.map((item, index) => (
            <Button
              key={index}
              className={`${TILE_SIZE} ${gameState.revealed[index] ? (item === "bomb" ? "bg-red-500" : "bg-green-500") : ""}`}
              onClick={() => revealTile(index)}
              disabled={gameState.revealed[index]}
            >
              {gameState.revealed[index] ? (item === "bomb" ? "💣" : "₿") : "❓"}
            </Button>
          ))}
        </CardContent>
      </Card>
      <div className="text-center">
        <p className="text-lg font-bold">Earnings: {gameState.earnings.toFixed(4)} CBTC</p>
        {gameState.gameOver && <p className="text-red-500 font-bold mt-2">Game Over! You hit a bomb.</p>}
      </div>
    </div>
  );
}