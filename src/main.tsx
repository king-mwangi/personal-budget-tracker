import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ToastProvider } from './components/Toast.tsx';
import { UIModalProvider } from './context/UIModalContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <UIModalProvider>
        <App />
      </UIModalProvider>
    </ToastProvider>
  </StrictMode>,
);

