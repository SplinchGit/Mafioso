import { useState } from 'react';
import { confirmSignUp, resendSignUpCode, signIn, signUp } from 'aws-amplify/auth';
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

  const handleResend = async () => {
    setError(null); setMessage(null);
    try {
      await resendSignUpCode({ username: email.trim() });
      setMessage('A fresh family code is on its way. Check spam if it does not arrive in a minute.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code');
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void (mode === 'signin' ? handleSignIn() : mode === 'signup' ? handleSignUp() : handleConfirm());
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07090d] px-4 py-10 sm:px-6 lg:grid lg:place-items-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(185,28,28,0.22),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(180,83,9,0.12),transparent_30%)]" />
      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d1016]/95 shadow-2xl shadow-black/70 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden min-h-[680px] flex-col justify-between border-r border-white/10 bg-[linear-gradient(145deg,rgba(127,29,29,0.35),rgba(8,10,14,0.9)_60%)] p-12 lg:flex">
          <div>
            <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-mafia-red/30 bg-mafia-red/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-mafia-red">Private access · live economy</div>
            <h1 className="max-w-xl text-6xl font-black leading-[0.95] tracking-tight text-white">Build the family.<br /><span className="text-mafia-red">Own the city.</span></h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-mafia-gray-300">Run goods, build a crew, collect properties and work your way from Beggar to Infamous Mafioso.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['20', 'ranks'], ['5', 'cities'], ['25', 'properties']].map(([value, label]) => <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-2xl font-black text-mafia-gold">{value}</div><div className="mt-1 text-xs uppercase tracking-wider text-mafia-gray-400">{label}</div></div>)}
          </div>
        </section>

        <section className="flex min-h-[620px] items-center p-6 sm:p-10 lg:p-12">
          <form onSubmit={submit} className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-mafia-red/40 bg-mafia-red/10 text-2xl">♠</div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-mafia-red">Mafioso</p>
              <h2 className="text-3xl font-black text-white">{mode === 'signin' ? 'Return to the table' : mode === 'signup' ? 'Join the family' : 'Confirm your address'}</h2>
              <p className="mt-3 text-sm leading-6 text-mafia-gray-400">{mode === 'confirm' ? 'We emailed a one-time family code. It proves this address belongs to you; it does not grant any game or admin privileges.' : 'Your progress and every economy action are checked by the live Mafioso server.'}</p>
            </div>

            {error && <div className="mb-4 rounded-xl border border-blood/60 bg-blood/10 p-3 text-sm text-blood">{error}</div>}
            {message && <div className="mb-4 rounded-xl border border-mafia-gold/30 bg-mafia-gold/10 p-3 text-sm text-mafia-gold">{message}</div>}

            <div className="space-y-4">
              <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mafia-gray-400">Email</span><input required className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-white outline-none transition focus:border-mafia-red" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
              {mode === 'signup' && <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mafia-gray-400">Street name</span><input required className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-white outline-none transition focus:border-mafia-red" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="3–20 letters, numbers or underscores" autoComplete="nickname" /></label>}
              {mode !== 'confirm' && <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mafia-gray-400">Password</span><input required minLength={8} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-white outline-none transition focus:border-mafia-red" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></label>}
              {mode === 'confirm' && <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mafia-gray-400">Family code</span><input required className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-center font-mono text-xl tracking-[0.35em] text-white outline-none transition focus:border-mafia-red" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" /></label>}

              <button type="submit" disabled={isAuthenticating} className="btn-mafia w-full py-3.5 text-base disabled:opacity-50">{isAuthenticating ? 'Working…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Confirm account'}</button>
              {mode === 'confirm' && <button type="button" onClick={() => void handleResend()} className="w-full text-sm font-semibold text-mafia-gold hover:text-white">Send another code</button>}
              <button type="button" className="w-full text-sm text-mafia-gray-400 hover:text-white" onClick={() => { setError(null); setMessage(null); setMode(mode === 'signin' ? 'signup' : 'signin'); }}>{mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
            </div>

            <p className="mt-8 border-t border-white/10 pt-5 text-center text-xs leading-5 text-mafia-gray-500">Identity is handled by AWS Cognito. Players can play the game; they cannot edit Mafioso, its server, or its mechanics.</p>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
