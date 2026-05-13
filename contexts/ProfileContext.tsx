import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { artemisApi } from '../api/artemisClient';
import { useAuth } from './AuthContext';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

type ProfileContextType = {
  avatarUrl: string | null;
  displayName: string | null;
  /** True only during the very first load (not on subsequent refreshes) */
  profileLoading: boolean;
  /** True if all retry attempts failed */
  profileError: boolean;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType>({
  avatarUrl: null,
  displayName: null,
  profileLoading: false,
  profileError: false,
  refreshProfile: async () => {},
});

export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const hasFetchedRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    if (!token) return;

    setProfileError(false);

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await artemisApi.getMe();
        setAvatarUrl(data.avatar_url ?? null);
        setDisplayName(data.display_name ?? null);
        setProfileError(false);
        return; // success — stop retrying
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          // Wait before the next attempt (exponential-ish: 2s, 4s)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        }
      }
    }

    // All retries exhausted
    console.warn('[ProfileContext] getMe failed after', MAX_RETRIES, 'attempts:', lastError);
    setProfileError(true);
  }, [token]);

  // Fetch once when the user's token first becomes available
  useEffect(() => {
    if (token && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      setProfileLoading(true);
      refreshProfile().finally(() => setProfileLoading(false));
    }

    if (!token) {
      // Clear everything on logout so stale data never leaks to the next session
      hasFetchedRef.current = false;
      setAvatarUrl(null);
      setDisplayName(null);
      setProfileError(false);
    }
  }, [token, refreshProfile]);

  return (
    <ProfileContext.Provider value={{ avatarUrl, displayName, profileLoading, profileError, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};
