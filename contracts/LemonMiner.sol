// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LemonMiner is Ownable, ReentrancyGuard {
    struct PlayerStats {
        uint256 totalGames;
        uint256 totalWins;
        uint256 totalLosses;
        uint256 totalEarnings;
    }

    mapping(address => PlayerStats) public playerStats;
    mapping(address => uint256) public playerBalance;
    mapping(address => uint256) public playerDeposits;

    event GameStarted(address indexed player, uint256 betAmount);
    event GameCompleted(address indexed player, bool won, uint256 earnings);
    event Withdrawn(address indexed player, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function startGame() external payable nonReentrant {
        require(msg.value > 0, "Bet amount must be greater than 0");
        playerDeposits[msg.sender] = msg.value;
        emit GameStarted(msg.sender, msg.value);
    }

    function completeGame(bool won, uint256 earnings) external nonReentrant {
        require(playerDeposits[msg.sender] > 0, "No active game");
        
        PlayerStats storage stats = playerStats[msg.sender];
        stats.totalGames++;
        
        if (won) {
            stats.totalWins++;
            stats.totalEarnings += earnings;
            playerBalance[msg.sender] += earnings;
            emit GameCompleted(msg.sender, true, earnings);
        } else {
            stats.totalLosses++;
            emit GameCompleted(msg.sender, false, 0);
        }
        
        playerDeposits[msg.sender] = 0;
    }

    function withdraw() external nonReentrant {
        uint256 amount = playerBalance[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        playerBalance[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit Withdrawn(msg.sender, amount);
    }

    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        return playerStats[player];
    }

    function getPlayerBalance(address player) external view returns (uint256) {
        return playerBalance[player];
    }

    function getPlayerDeposit(address player) external view returns (uint256) {
        return playerDeposits[player];
    }
} 