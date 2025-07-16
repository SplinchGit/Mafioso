import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { useGameStore } from './store/gameStore';
import { useInactivityLogout } from './hooks';
import { shouldBlockBrowser } from './utils/deviceDetection';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Crimes from './pages/Crimes';
import Travel from './pages/Travel';
import Garage from './pages/Garage';
import Store from './pages/Store';
import Shoot from './pages/Shoot';
import Navigation from './components/Navigation';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBanner from './components/ErrorBanner';
import BrowserBlock from './components/BrowserBlock';

// Configure Amplify (you'll need to add your actual config)
const amplifyConfig = {
  API: {
    REST: {
      mafioso: {
        endpoint: import.meta.env.VITE_API_ENDPOINT || 'https://api.mafioso.game',
        region: import.meta.env.VITE_AWS_REGION || 'us-east-1'
      }
    }
  }
};

Amplify.configure(amplifyConfig);

function App() {
  const { player, isLoading, error, setLoading } = useGameStore();
  
  // Check if browser should be blocked
  if (shouldBlockBrowser()) {
    return <BrowserBlock />;
  }
  
  // Set up inactivity logout
  useInactivityLogout();

  useEffect(() => {
    // Initialize app state on load
    const initializeApp = async () => {
      setLoading(true);
      
      // Check for existing auth token and validate session
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          // Validate token with backend
          const response = await fetch('/api/auth/validate', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            useGameStore.getState().setPlayer(data.player);
          } else {
            // Invalid token or inactivity timeout, clear it
            localStorage.removeItem('auth_token');
            const errorData = await response.json().catch(() => ({}));
            if (errorData.code === 'INACTIVITY_TIMEOUT') {
              useGameStore.getState().setError('Session expired due to inactivity. Please sign in again.');
            }
          }
        } catch (error) {
          console.error('Failed to validate token:', error);
          localStorage.removeItem('auth_token');
        }
      }
      
      setLoading(false);
    };

    initializeApp();
  }, [setLoading]);

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (isLoading) {
      return <LoadingSpinner />;
    }
    
    if (!player) {
      return <Navigate to="/login" replace />;
    }
    
    return <>{children}</>;
  };

  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    if (isLoading) {
      return <LoadingSpinner />;
    }
    
    if (player) {
      return <Navigate to="/dashboard" replace />;
    }
    
    return <>{children}</>;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-mafia-darker to-mafia-dark text-white">
        {error && <ErrorBanner />}
        
        {player && <Navigation />}
        
        <main className={`${player ? 'pt-16' : ''}`}>
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/crimes" 
              element={
                <ProtectedRoute>
                  <Crimes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/travel" 
              element={
                <ProtectedRoute>
                  <Travel />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/garage" 
              element={
                <ProtectedRoute>
                  <Garage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/store" 
              element={
                <ProtectedRoute>
                  <Store />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/shoot" 
              element={
                <ProtectedRoute>
                  <Shoot />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/" 
              element={
                player ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
