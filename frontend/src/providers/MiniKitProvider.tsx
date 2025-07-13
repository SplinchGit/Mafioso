import React, { useEffect, useState } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

interface MiniKitProviderProps {
  children: React.ReactNode;
}

export default function MiniKitProvider({ children }: MiniKitProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initMiniKit = async () => {
      const appId = import.meta.env.VITE_WORLDCOIN_APP_ID || 'app_bc75ea0f4623eb64e1814126df474de3';
      
      if (!MiniKit.isInstalled()) {
        await MiniKit.install(appId);
      }
      
      setIsReady(true);
    };

    initMiniKit().catch(console.error);
  }, []);

  if (!isReady) return null;
  
  return <>{children}</>;
}