import { type ReactNode } from 'react';
import { MiniKitProvider as Provider } from '@worldcoin/minikit-js/minikit-provider';

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  return <Provider>{children}</Provider>;
}