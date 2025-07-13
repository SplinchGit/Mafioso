import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import MiniKitProvider from './providers/MiniKitProvider.tsx'

// Always show Eruda for debugging
import('eruda').then(({ default: eruda }) => {
  eruda.init();
  eruda.show();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MiniKitProvider>
      <App />
    </MiniKitProvider>
  </StrictMode>,
)
