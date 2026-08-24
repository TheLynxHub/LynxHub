import '@lynx_shared/styles.css';

import HeroUIProvider from '@lynx_shared/HeroUIProvider';
import {createRoot} from 'react-dom/client';

import BookmarkTooltip from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

/**
 * Entry point for the Bookmark Tooltip window.
 */
createRoot(rootElement).render(
  <HeroUIProvider>
    <BookmarkTooltip />
  </HeroUIProvider>,
);
