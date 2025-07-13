import { MiniKit, type MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';

export async function triggerWalletAuth(nonce: string): Promise<MiniAppWalletAuthSuccessPayload> {
  if (!MiniKit.isInstalled()) {
    throw new Error('MiniKit not installed');
  }

  const result = await MiniKit.commandsAsync.walletAuth({
    nonce,
    statement: 'Sign in to Mafioso',
    expirationTime: new Date(Date.now() + 10 * 60 * 1000),
  });

  if (result.finalPayload.status !== 'success') {
    throw new Error('Authentication failed');
  }

  return result.finalPayload as MiniAppWalletAuthSuccessPayload;
}