import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import MiniKitProvider from './providers/MiniKitProvider.tsx'

// Initialize Eruda for debugging (click floating icon to open)
import('eruda').then(({ default: eruda }) => {
  eruda.init();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MiniKitProvider>
      <App />
    </MiniKitProvider>
  </StrictMode>,
)
