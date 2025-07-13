import { useState } from 'react';

interface ChooseUsernameProps {
  walletAddress: string;
  onUsernameSelected: (player: any, token: string) => void;
  onBack: () => void;
}

const ChooseUsername = ({ walletAddress, onUsernameSelected, onBack }: ChooseUsernameProps) => {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateUsername = (username: string): string | null => {
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be at most 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
    return null;
  };

  const checkAvailability = async (username: string) => {
    const validation = validateUsername(username);
    if (validation) {
      setError(validation);
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      if (response.ok) {
        setIsAvailable(data.available);
        if (!data.available) {
          setError('Username is already taken');
        }
      } else {
        setError(data.error || 'Failed to check username availability');
        setIsAvailable(null);
      }
    } catch (error) {
      setError('Failed to check username availability');
      setIsAvailable(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
    setIsAvailable(null);
    setError(null);

    // Debounce availability check
    if (newUsername.length >= 3) {
      const timer = setTimeout(() => {
        checkAvailability(newUsername);
      }, 500);
      return () => clearTimeout(timer);
    }
  };

  const handleCreateAccount = async () => {
    if (!username || !isAvailable) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          username,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onUsernameSelected(data.player, data.token);
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (error) {
      setError('Failed to create account');
    } finally {
      setIsCreating(false);
    }
  };

  const truncatedAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-mafia max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-mafia-red mb-2">
            🎭 Welcome to MAFIOSO
          </h1>
          <p className="text-mafia-gray-400 text-sm">
            Connected wallet: <span className="text-mafia-gold">{truncatedAddress}</span>
          </p>
        </div>

        <div className="mb-8">
          <p className="text-white mb-6">
            Choose your criminal alias to begin your journey in the underworld.
          </p>
          
          <div className="bg-mafia-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-mafia-gold font-semibold mb-2">👤 Choose Username</h3>
            <p className="text-sm text-mafia-gray-400 mb-4">
              3-20 characters, letters, numbers, and underscores only
            </p>
            
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter your username"
                className="w-full px-4 py-3 bg-mafia-darker text-white rounded-lg border border-mafia-gray-600 focus:border-mafia-red focus:outline-none"
                maxLength={20}
                disabled={isCreating}
              />
              
              {isChecking && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-mafia-red"></div>
                </div>
              )}
              
              {isAvailable === true && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-green-500">✓</span>
                </div>
              )}
              
              {isAvailable === false && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-red-500">✗</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-blood/20 border border-blood rounded-lg p-3 mb-6">
            <p className="text-blood text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleCreateAccount}
            disabled={!username || !isAvailable || isCreating || isChecking}
            className={`w-full text-lg py-4 px-6 rounded-lg font-semibold transition-all duration-200 ${
              username && isAvailable && !isCreating && !isChecking
                ? 'btn-mafia hover:scale-105 transform'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isCreating ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Creating Account...
              </div>
            ) : (
              'Create Account & Enter'
            )}
          </button>

          <button
            onClick={onBack}
            disabled={isCreating}
            className="w-full text-mafia-gray-400 hover:text-white py-2 transition-colors"
          >
            ← Back to Wallet Selection
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-mafia-gray-700">
          <div className="text-xs text-mafia-gray-500">
            <p className="mb-2">🔐 Your account will be permanently linked to this wallet</p>
            <p>Use the same wallet to automatically recover your account</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChooseUsername;