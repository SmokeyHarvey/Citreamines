import { initializeApp, getApps } from '@firebase/app';
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  query, 
  orderByChild,
  Database,
  DatabaseReference 
} from '@firebase/database';

interface LeaderboardEntry {
  address: string;
  totalGames: number;
  wins: number;
  losses: number;
  totalEarnings: string;
  lastUpdated: string;
}

export class LeaderboardService {
  private db: Database;
  private static instance: LeaderboardService;

  private constructor() {
    const requiredEnvVars = [
      'REACT_APP_FIREBASE_API_KEY',
      'REACT_APP_FIREBASE_AUTH_DOMAIN',
      'REACT_APP_FIREBASE_PROJECT_ID',
      'REACT_APP_FIREBASE_DATABASE_URL',
      'REACT_APP_FIREBASE_STORAGE_BUCKET',
      'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
      'REACT_APP_FIREBASE_APP_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error('Missing required Firebase configuration environment variables');
    }

    const firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID
    };

    try {
      if (!getApps().length) {
        initializeApp(firebaseConfig);
      }
      this.db = getDatabase();
      LeaderboardService.instance = this;
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      throw error;
    }
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const leaderboardRef: DatabaseReference = ref(this.db, 'leaderboard');
      const leaderboardQuery = query(leaderboardRef, orderByChild('totalEarnings'));
      const snapshot = await get(leaderboardQuery);
      
      if (!snapshot.exists()) {
        return [];
      }

      const entries = Object.values(snapshot.val()) as LeaderboardEntry[];
      return entries.sort((a, b) => parseFloat(b.totalEarnings) - parseFloat(a.totalEarnings));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  async updatePlayerStats(stats: Omit<LeaderboardEntry, 'lastUpdated'>) {
    try {
      const now = new Date().toISOString();
      const playerRef: DatabaseReference = ref(this.db, `leaderboard/${stats.address}`);
      
      await set(playerRef, {
        ...stats,
        lastUpdated: now
      });
    } catch (error) {
      console.error('Error updating player stats:', error);
      throw error;
    }
  }
} 