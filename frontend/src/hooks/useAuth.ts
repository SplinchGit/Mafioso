import { useEffect, useState } from 'react';
import { fetchAuthSession, signOut as cognitoSignOut } from 'aws-amplify/auth';
import { useGameStore } from '../store/gameStore';

export const useAuth = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { player, setPlayer, setLoading, logout } = useGameStore();

  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token || player) return;
      setLoading(true);
      try {
        const response = await fetch('/api/auth/validate', { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Session expired');
        const data = await response.json();
        setPlayer(data.player);
      } catch {
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    };
    checkExistingAuth();
  }, [player, setPlayer, setLoading]);

  const establishCognitoSession = async (username?: string): Promise<{ success: boolean; needsUsername?: boolean; error?: string }> => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      if (!idToken) throw new Error('Cognito session is unavailable');
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(username ? { username } : {}),
      });
      const data = await response.json();
      if (!response.ok) {
        const error = data.error || 'Authentication failed';
        setAuthError(error);
        return { success: false, needsUsername: Boolean(data.needsUsername), error };
      }
      localStorage.setItem('auth_token', data.token);
      setPlayer(data.player);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(message);
      return { success: false, error: message };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try { await cognitoSignOut(); } catch { /* local cleanup still happens */ }
    localStorage.removeItem('auth_token');
    logout();
  };

  const refreshAuth = async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    try {
      const response = await fetch('/api/auth/validate', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Session expired');
      const data = await response.json();
      setPlayer(data.player);
      return true;
    } catch {
      await signOut();
      return false;
    }
  };

  return {
    player,
    isAuthenticating,
    authError,
    isAuthenticated: Boolean(player && localStorage.getItem('auth_token')),
    establishCognitoSession,
    signOut,
    refreshAuth,
    getAuthToken: () => localStorage.getItem('auth_token'),
    clearAuthError: () => setAuthError(null),
  };
};
