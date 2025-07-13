import { ReactNode } from 'react';
import { MiniKitProvider as Provider } from '@worldcoin/minikit-js/react';

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  return <Provider>{children}</Provider>;
}