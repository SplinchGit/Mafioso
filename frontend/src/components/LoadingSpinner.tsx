const LoadingSpinner = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mafia-darker to-mafia-dark">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-mafia-red mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-mafia-red mb-2">🎭 MAFIOSO</h2>
        <p className="text-mafia-gray-400">Loading your criminal empire...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;