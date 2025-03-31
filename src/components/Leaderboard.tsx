import { useEffect, useState } from 'react';
import { LeaderboardService } from '../services/leaderboard';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
  address: string;
  totalGames: number;
  wins: number;
  losses: number;
  totalEarnings: string;
  lastUpdated: string;
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const service = new LeaderboardService();
        const data = await service.getLeaderboard();
        setEntries(data);
      } catch (err) {
        setError('Failed to load leaderboard data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        {error}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6"
    >
      <h2 className="text-2xl font-bold mb-6 text-center">Top Miners</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="px-4 py-3 text-left font-bold">Rank</th>
              <th className="px-4 py-3 text-left font-bold">Address</th>
              <th className="px-4 py-3 text-right font-bold">Games</th>
              <th className="px-4 py-3 text-right font-bold">Wins</th>
              <th className="px-4 py-3 text-right font-bold">Win Rate</th>
              <th className="px-4 py-3 text-right font-bold">Earnings</th>
              <th className="px-4 py-3 text-right font-bold">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <motion.tr
                key={entry.address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="border-b border-gray-100 hover:bg-gray-50/50"
              >
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-semibold text-sm">
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-sm">
                  {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                </td>
                <td className="px-4 py-3 text-right">{entry.totalGames}</td>
                <td className="px-4 py-3 text-right">{entry.wins}</td>
                <td className="px-4 py-3 text-right">
                  {((entry.wins / entry.totalGames) * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-orange-600">
                  {parseFloat(entry.totalEarnings).toFixed(3)} CBTC
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500">
                  {new Date(entry.lastUpdated).toLocaleDateString()}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
} 