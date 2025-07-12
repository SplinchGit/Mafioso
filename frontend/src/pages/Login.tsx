import { useState } from 'react';
import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit';
import { useGameStore } from '../store/gameStore';

const Login = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const { setPlayer, setLoading, setError } = useGameStore();

  const handleWorldIdSuccess = async (result: ISuccessResult) => {
    setIsVerifying(true);
    setVerificationError(null);

    try {
      // Send verification to backend
      const response = await fetch('/api/auth/verify-worldid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nullifier_hash: result.nullifier_hash,
          merkle_root: result.merkle_root,
          proof: result.proof,
          verification_level: result.verification_level
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Store auth token
      localStorage.setItem('auth_token', data.token);
      
      // Update game state
      setPlayer(data.player);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      setVerificationError(errorMessage);
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleWorldIdError = (error: Error) => {
    console.error('World ID verification error:', error);
    setVerificationError('World ID verification failed. Please try again.');
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

        {verificationError && (
          <div className="bg-blood/20 border border-blood rounded-lg p-3 mb-6">
            <p className="text-blood text-sm">{verificationError}</p>
          </div>
        )}

        <div className="space-y-4">
          {isVerifying ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mafia-red"></div>
              <span className="ml-3 text-mafia-gray-400">Verifying identity...</span>
            </div>
          ) : (
            <IDKitWidget
              app_id={import.meta.env.VITE_WORLDCOIN_APP_ID || "app_staging_123456789"}
              action="login"
              onSuccess={handleWorldIdSuccess}
              onError={handleWorldIdError}
              verification_level={VerificationLevel.Orb}
            >
              {({ open }) => (
                <button
                  onClick={open}
                  className="w-full btn-mafia text-lg py-4 px-6 hover:scale-105 transform transition-all duration-200"
                >
                  🌍 Verify with World ID
                </button>
              )}
            </IDKitWidget>
          )}

          <div className="text-xs text-mafia-gray-500 mt-4">
            <p>World ID verification ensures:</p>
            <ul className="mt-2 space-y-1">
              <li>• One account per person</li>
              <li>• Fair gameplay for everyone</li>
              <li>• Secure identity verification</li>
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