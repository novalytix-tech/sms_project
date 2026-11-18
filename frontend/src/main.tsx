import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import './styles/variables.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import App from './App';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const root = createRoot(document.getElementById('root')!);

if (!publishableKey) {
  root.render(
    <p style={{ fontFamily: 'sans-serif', padding: 24 }}>
      Configuration error: VITE_CLERK_PUBLISHABLE_KEY is not set.
    </p>,
  );
} else {
  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={publishableKey} signInUrl="/login" afterSignOutUrl="/login">
        <App />
      </ClerkProvider>
    </StrictMode>,
  );
}
