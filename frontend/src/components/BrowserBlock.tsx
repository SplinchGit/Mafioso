import React from 'react';

const BrowserBlock: React.FC = () => {
  const awsLink = "https://mafioso.game"; // Replace with your actual AWS link

  return (
    <div className="min-h-screen bg-gradient-to-br from-mafia-darker to-mafia-dark text-white flex items-center justify-center">
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-3xl font-bold mb-4">Browser Not Supported</h1>
        </div>
        
        <div className="bg-mafia-light/20 backdrop-blur-sm rounded-lg p-6 mb-6">
          <p className="text-lg mb-4">
            This application is designed to work within the World App only.
          </p>
          <p className="text-sm text-gray-300 mb-6">
            Please open this app through the World App to access all features.
          </p>
        </div>

        <a 
          href={awsLink}
          className="inline-block bg-mafia-primary hover:bg-mafia-primary-dark transition-colors duration-200 text-white font-semibold py-3 px-6 rounded-lg"
        >
          Open in World App
        </a>
        
        <div className="mt-6 text-xs text-gray-400">
          <p>Access this app through World App for the best experience</p>
        </div>
      </div>
    </div>
  );
};

export default BrowserBlock;