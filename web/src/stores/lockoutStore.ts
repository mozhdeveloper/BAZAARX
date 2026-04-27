import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LockoutData {
  count: number;
  lastFailedAt: number;
}

interface LockoutState {
  failedAttempts: Record<string, LockoutData>;
  recordFailure: (email: string) => void;
  recordSuccess: (email: string) => void;
  getRemainingLockoutTime: (email: string) => number; // returns seconds remaining
}

export const useLockoutStore = create<LockoutState>()(
  persist(
    (set, get) => ({
      failedAttempts: {},

      recordFailure: (email: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        const current = get().failedAttempts[normalizedEmail] || { count: 0, lastFailedAt: 0 };
        
        set((state) => ({
          failedAttempts: {
            ...state.failedAttempts,
            [normalizedEmail]: {
              count: current.count + 1,
              lastFailedAt: Date.now(),
            },
          },
        }));
      },

      recordSuccess: (email: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        set((state) => {
          const newFailedAttempts = { ...state.failedAttempts };
          delete newFailedAttempts[normalizedEmail];
          return { failedAttempts: newFailedAttempts };
        });
      },

      getRemainingLockoutTime: (email: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        const data = get().failedAttempts[normalizedEmail];
        
        if (!data || data.count < 3) return 0;

        let delayInSeconds = 0;
        
        if (data.count === 3 || data.count === 4) {
          delayInSeconds = 30;
        } else if (data.count >= 5) {
          // Attempt 5 doubles attempt 4 (30s -> 60s)
          // Exponential backoff: 30 * 2^(count - 4)
          const power = Math.min(data.count - 4, 10); // Cap exponential growth
          delayInSeconds = 30 * Math.pow(2, power);
        }

        const elapsedSeconds = (Date.now() - data.lastFailedAt) / 1000;
        const remaining = Math.ceil(delayInSeconds - elapsedSeconds);
        
        return remaining > 0 ? remaining : 0;
      },
    }),
    {
      name: 'lockout-storage',
    }
  )
);
