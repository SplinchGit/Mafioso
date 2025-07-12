import { useGameStore } from '../store/gameStore';

const ErrorBanner = () => {
  const { error, clearError } = useGameStore();

  if (!error) return null;

  return (
    <div className="bg-blood/20 border-b border-blood px-4 py-3 relative">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center">
          <span className="text-blood font-semibold">⚠️ Error:</span>
          <span className="text-white ml-2">{error}</span>
        </div>
        <button
          onClick={clearError}
          className="text-blood hover:text-red-300 transition-colors ml-4"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ErrorBanner;