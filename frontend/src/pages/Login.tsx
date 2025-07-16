import { useState, useEffect } from 'react';
import { MiniKit, VerificationLevel, type VerifyCommandInput, type ISuccessResult } from '@worldcoin/minikit-js';
import { useGameStore } from '../store/gameStore';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMiniKitInstalled, setIsMiniKitInstalled] = useState(false);
  const { setError } = useGameStore();
  const { authenticateWithMiniKit } = useAuth();

  useEffect(() => {
    setIsMiniKitInstalled(MiniKit.isInstalled());
  }, []);


  const handleWorldIDAuth = async () => {
    if (!MiniKit.isInstalled()) {
      setAuthError('Please open this app in the World App');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    const verifyPayload: VerifyCommandInput = {
      action: 'login', // This must match the action in your backend
      verification_level: VerificationLevel.Orb, // or VerificationLevel.Device
    };

    try {
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);
      
      if (finalPayload.status === 'success') {
        // Pass the successful payload to authenticateWithMiniKit
        const success = await authenticateWithMiniKit(finalPayload as ISuccessResult);
        if (!success) {
          setAuthError('Authentication failed');
        }
      } else {
        setAuthError('Verification failed');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'World ID authentication failed';
      setAuthError(msg);
      setError(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };


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
                Please open this app in the World App to use authentication
              </p>
            </div>
          )}

          {isAuthenticating ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mafia-red"></div>
              <span className="ml-3 text-mafia-gray-400">Authenticating...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleWorldIDAuth}
                disabled={!isMiniKitInstalled}
                className={`w-full text-lg py-4 px-6 hover:scale-105 transform transition-all duration-200 ${
                  isMiniKitInstalled 
                    ? 'btn-mafia' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                🌍 Sign in with World ID
              </button>
            </div>
          )}

          <div className="text-xs text-mafia-gray-500 mt-4">
            <p>Authentication options:</p>
            <ul className="mt-2 space-y-1">
              <li>• <strong>World ID:</strong> Human verification & unique identity</li>
              <li>• <strong>Wallet:</strong> Automatic recovery & secure identity</li>
              <li>• No passwords to remember</li>
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