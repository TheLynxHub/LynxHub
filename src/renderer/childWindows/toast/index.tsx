import '@lynx_shared/styles.css';

import HeroUIProvider from '@lynx_shared/HeroUIProvider';
import {createRoot} from 'react-dom/client';

import ToastContent from './App';

/**
 * Entry point for the Toast Window.
 * Initializes the React application with the HeroUIProvider.
 */
createRoot(document.getElementById('root') as HTMLElement).render(
  <HeroUIProvider>
    <ToastContent />
  </HeroUIProvider>,
);
