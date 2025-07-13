import { type ReactNode } from 'react';
import { MiniKitProvider as Provider } from '@worldcoin/minikit-js/minikit-provider';

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  return <Provider props={{ appId: 'app_bc75ea0f4623eb64e1814126df474de3' }}>{children}</Provider>;
}