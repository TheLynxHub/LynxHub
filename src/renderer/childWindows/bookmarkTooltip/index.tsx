import '@lynx_shared/styles.css';

import {createRoot} from 'react-dom/client';

import BookmarkTooltip from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

/**
 * Entry point for the Bookmark Tooltip window.
 */
createRoot(rootElement).render(<BookmarkTooltip />);
