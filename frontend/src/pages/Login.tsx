import { useState } from 'react';
import { confirmSignUp, signIn, signUp } from 'aws-amplify/auth';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const { establishCognitoSession, isAuthenticating } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'confirm'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const finishSession = async () => {
    const result = await establishCognitoSession(username || undefined);
    if (!result.success) setError(result.error || 'Could not start game session');
  };

  const handleSignIn = async () => {
    setError(null); setMessage(null);
    try {
      const result = await signIn({ username: email.trim(), password });
      if (!result.isSignedIn) throw new Error('Sign-in needs another Cognito step');
      await finishSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    }
  };

  const handleSignUp = async () => {
    setError(null); setMessage(null);
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('Username must be 3-20 letters, numbers or underscores');
      return;
    }
    try {
      const result = await signUp({
        username: email.trim(),
        password,
        options: { userAttributes: { email: email.trim(), preferred_username: username } },
      });
      if (result.isSignUpComplete) {
        const login = await signIn({ username: email.trim(), password });
        if (login.isSignedIn) await finishSession();
      } else {
        setMode('confirm');
        setMessage('Check your email for the confirmation code.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
    }
  };

  const handleConfirm = async () => {
    setError(null); setMessage(null);
    try {
      const result = await confirmSignUp({ username: email.trim(), confirmationCode: code.trim() });
      if (!result.isSignUpComplete) throw new Error('Account confirmation is not complete');
      const login = await signIn({ username: email.trim(), password });
      if (!login.isSignedIn) throw new Error('Sign-in could not complete');
      await finishSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-mafia max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-mafia-red mb-2">🎭 MAFIOSO</h1>
          <p className="text-mafia-gray-400">Build the empire. Own the city.</p>
        </div>

        {error && <div className="bg-blood/20 border border-blood rounded-lg p-3 mb-4 text-blood text-sm">{error}</div>}
        {message && <div className="bg-mafia-gray-700 rounded-lg p-3 mb-4 text-sm">{message}</div>}

        <div className="space-y-3">
          <input className="w-full rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
          {mode === 'signup' && <input className="w-full rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-3" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Mafioso username" autoComplete="nickname" />}
          {mode !== 'confirm' && <input className="w-full rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />}
          {mode === 'confirm' && <input className="w-full rounded bg-mafia-gray-900 border border-mafia-gray-600 px-3 py-3" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Confirmation code" inputMode="numeric" />}

          <button disabled={isAuthenticating} onClick={mode === 'signin' ? handleSignIn : mode === 'signup' ? handleSignUp : handleConfirm} className="btn-mafia w-full text-lg py-3 disabled:opacity-50">
            {isAuthenticating ? 'Working...' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Confirm account'}
          </button>

          <button className="w-full text-sm text-mafia-gray-400 hover:text-white" onClick={() => { setError(null); setMessage(null); setMode(mode === 'signin' ? 'signup' : 'signin'); }}>
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-mafia-gray-700 grid grid-cols-3 gap-4 text-center">
          <div><div className="text-mafia-red font-bold text-lg">20</div><div className="text-xs text-mafia-gray-400">Ranks</div></div>
          <div><div className="text-mafia-gold font-bold text-lg">5</div><div className="text-xs text-mafia-gray-400">Cities</div></div>
          <div><div className="text-money font-bold text-lg">5</div><div className="text-xs text-mafia-gray-400">Props / city</div></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
