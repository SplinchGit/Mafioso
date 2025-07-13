import { useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useGameStore } from '../store/gameStore';
import ChooseUsername from '../components/ChooseUsername';
import { triggerWalletAuth } from '../utils/minikit';

const Login = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMiniKitInstalled, setIsMiniKitInstalled] = useState(false);
  const [showUsernameSelection, setShowUsernameSelection] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { setPlayer, setError } = useGameStore();

  useEffect(() => {
    setIsMiniKitInstalled(MiniKit.isInstalled());
  }, []);

  const handleWalletAuth = async () => {
    if (!MiniKit.isInstalled()) {
      setAuthError('Please open this app in the World App');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Debug: Log environment
      console.log('[AUTH] Starting wallet auth flow');
      console.log('[AUTH] Environment:', import.meta.env.MODE);
      console.log('[AUTH] API Endpoint:', import.meta.env.VITE_API_ENDPOINT);
      
      // Get nonce with detailed error handling
      const apiUrl = import.meta.env.PROD 
        ? `${import.meta.env.VITE_API_ENDPOINT}/auth/nonce`
        : '/api/auth/nonce';
      
      console.log('[AUTH] Fetching nonce from:', apiUrl);
      
      let nonceResponse;
      try {
        nonceResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        });
        
        console.log('[AUTH] Nonce response status:', nonceResponse.status);
        console.log('[AUTH] Nonce response headers:', Object.fromEntries(nonceResponse.headers.entries()));
        
        if (!nonceResponse.ok) {
          const errorText = await nonceResponse.text();
          console.error('[AUTH] Nonce request failed:', errorText);
          throw new Error(`Failed to get nonce: ${nonceResponse.status} ${errorText}`);
        }
      } catch (fetchError) {
        console.error('[AUTH] Fetch error details:', {
          message: fetchError instanceof Error ? fetchError.message : String(fetchError),
          stack: fetchError instanceof Error ? fetchError.stack : undefined,
          type: fetchError instanceof Error ? fetchError.name : typeof fetchError
        });
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      }
      
      const nonceData = await nonceResponse.json();
      console.log('[AUTH] Nonce received:', nonceData);
      
      if (!nonceData.success || !nonceData.nonce) {
        throw new Error('Invalid nonce response');
      }

      // Trigger wallet auth
      console.log('[AUTH] Triggering MiniKit wallet auth');
      const payload = await triggerWalletAuth(nonceData.nonce);
      console.log('[AUTH] Wallet auth successful:', payload);
      
      // Send to backend
      const loginUrl = import.meta.env.PROD
        ? `${import.meta.env.VITE_API_ENDPOINT}/auth/wallet-login`
        : '/api/auth/wallet-login';
      
      console.log('[AUTH] Sending login request to:', loginUrl);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, nonce: nonceData.nonce }),
        mode: 'cors'
      });

      console.log('[AUTH] Login response:', response.status);
      
      const data = await response.json();
      if (!response.ok) {
        console.error('[AUTH] Login failed:', data);
        throw new Error(data.error);
      }

      console.log('[AUTH] Login successful:', data);
      
      if (data.hasAccount) {
        localStorage.setItem('auth_token', data.token);
        setPlayer(data.player);
      } else {
        setWalletAddress(payload.address);
        setShowUsernameSelection(true);
      }
    } catch (error) {
      console.error('[AUTH] Complete error:', error);
      const msg = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(msg);
      setError(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleUsernameSelected = (player: any, token: string) => {
    localStorage.setItem('auth_token', token);
    setPlayer(player);
    setShowUsernameSelection(false);
  };

  if (showUsernameSelection && walletAddress) {
    return (
      <ChooseUsername 
        walletAddress={walletAddress}
        onUsernameSelected={handleUsernameSelected}
        onBack={() => setShowUsernameSelection(false)}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-mafia max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-mafia-red mb-2">
            🎭 MAFIOSO
          </h1>
          <p className="text-mafia-gray-400 text-lg">
            Enter the world of organized crime
          </p>
        </div>

        <div className="mb-8">
          <p className="text-white mb-4">
            Build your criminal empire from the streets to the penthouse. 
            Commit crimes, earn respect, and become the ultimate Mafioso.
          </p>
          
          <div className="bg-mafia-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-mafia-gold font-semibold mb-2">🌍 World Mini App</h3>
            <p className="text-sm text-mafia-gray-400">
              Authenticate with World ID to ensure a unique gaming experience
            </p>
          </div>
        </div>

        {authError && (
          <div className="bg-blood/20 border border-blood rounded-lg p-3 mb-6">
            <p className="text-blood text-sm">{authError}</p>
          </div>
        )}

        <div className="space-y-4">
          {!isMiniKitInstalled && (
            <div className="bg-yellow-600/20 border border-yellow-600 rounded-lg p-3 mb-6">
              <p className="text-yellow-200 text-sm">
                Please open this app in the World App to use wallet authentication
              </p>
            </div>
          )}

          {isAuthenticating ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mafia-red"></div>
              <span className="ml-3 text-mafia-gray-400">Authenticating...</span>
            </div>
          ) : (
            <button
              onClick={handleWalletAuth}
              disabled={!isMiniKitInstalled}
              className={`w-full text-lg py-4 px-6 hover:scale-105 transform transition-all duration-200 ${
                isMiniKitInstalled 
                  ? 'btn-mafia' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              👛 Sign in with Wallet
            </button>
          )}

          <div className="text-xs text-mafia-gray-500 mt-4">
            <p>Wallet authentication provides:</p>
            <ul className="mt-2 space-y-1">
              <li>• Automatic account recovery</li>
              <li>• No passwords to remember</li>
              <li>• Secure wallet-based identity</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-mafia-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-mafia-red font-bold text-lg">20</div>
              <div className="text-xs text-mafia-gray-400">Ranks</div>
            </div>
            <div>
              <div className="text-mafia-gold font-bold text-lg">5</div>
              <div className="text-xs text-mafia-gray-400">Cities</div>
            </div>
            <div>
              <div className="text-money font-bold text-lg">11</div>
              <div className="text-xs text-mafia-gray-400">Crimes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;