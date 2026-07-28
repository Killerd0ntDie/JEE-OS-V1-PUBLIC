import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { StudyBrainProvider } from './context/StudyBrainContext.tsx';
import { ToastProvider } from './components/ui/ToastProvider.tsx';
import 'katex/dist/katex.min.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <StudyBrainProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </StudyBrainProvider>
    </AuthProvider>
  </StrictMode>,
);
