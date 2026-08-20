import {RunningCard} from '@lynx/types';
import {memo} from 'react';

import {isBookmarksBarVisible} from '../../bookmarks/BookmarksBar';
import {useBookmarks} from '../../bookmarks/useBookmarks';
import BrowserError from './BrowserError';
import BrowserHome from './BrowserHome';
import BrowserViewPlaceholder from './BrowserViewPlaceholder';
import {useBrowser} from './hooks/useBrowser';

type Props = {runningCard: RunningCard};

const Browser = memo(({runningCard}: Props) => {
  const {failedLoad, handleReload, showEmptyPage, currentView, type} = useBrowser(runningCard);
  const {visibility} = useBookmarks();

  const isBarVisible = isBookmarksBarVisible(visibility, runningCard);

  return (
    <div
      className={
        `absolute inset-0 ${isBarVisible ? 'top-[72px]!' : 'top-10!'} overflow-hidden bg-white ` +
        `shadow-md dark:bg-LynxNearBlack ${currentView === 'browser' ? 'block' : 'hidden'}`
      }>
      {showEmptyPage ? (
        <BrowserHome type={type} />
      ) : failedLoad ? (
        <BrowserError error={failedLoad} id={runningCard.id} onReload={handleReload} />
      ) : (
        <BrowserViewPlaceholder />
      )}
    </div>
  );
});

export default Browser;
