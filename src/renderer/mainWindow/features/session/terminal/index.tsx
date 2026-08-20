import XTermCore, {XTermAPI} from '@lynx/components/XTermCore';
import {RunningCard} from '@lynx/types';
import {SearchAddon} from '@xterm/addon-search';
import {SerializeAddon} from '@xterm/addon-serialize';
import {Dispatch, memo, RefObject, SetStateAction, useEffect, useMemo} from 'react';

import {useTabsState} from '../../../redux/reducers/tabs';
import {isBookmarksBarVisible} from '../../bookmarks/BookmarksBar';
import {useBookmarks} from '../../bookmarks/useBookmarks';
import {useTerminalBrowserIntegration} from './hooks/useTerminalBrowserIntegration';
import {useTerminalClipboard} from './hooks/useTerminalClipboard';
import {useTerminalHotkeys} from './hooks/useTerminalHotkeys';
import {useTerminalProgress} from './hooks/useTerminalProgress';
import {useTerminalResize} from './hooks/useTerminalResize';
import {useTerminalSetup} from './hooks/useTerminalSetup';

type Props = {
  runningCard: RunningCard;
  serializeAddon: SerializeAddon;
  searchAddon: SearchAddon;
  clearTerminal: RefObject<(() => void) | undefined>;
  setSelectedTerminalText: Dispatch<SetStateAction<string>>;
  xtermRef: RefObject<XTermAPI | null>;
};

const Terminal = memo(
  ({runningCard, serializeAddon, searchAddon, clearTerminal, setSelectedTerminalText, xtermRef}: Props) => {
    const {webUIAddress, id, currentView, tabId, type} = useMemo(() => runningCard, [runningCard]);
    const activeTab = useTabsState('activeTab');
    const {visibility} = useBookmarks();

    const isBarVisible = isBookmarksBarVisible(visibility, runningCard);

    useEffect(() => {
      if (currentView === 'terminal' && activeTab === tabId) {
        const term = xtermRef.current?.terminal;
        if (term) term.focus();
      }
    }, [currentView, activeTab, tabId]);

    // 1. Hotkeys
    const {quickHotkeySet} = useTerminalHotkeys();

    // 2. Clipboard
    const {copySelection} = useTerminalClipboard(xtermRef);

    // 3. Browser Integration
    useTerminalBrowserIntegration(id, tabId, webUIAddress);

    // 4. Progress
    const {handleProgress} = useTerminalProgress(tabId);

    // 5. Resize
    useTerminalResize(xtermRef, currentView);

    // 6. Setup (Ready handler)
    const {handleTerminalReady} = useTerminalSetup({
      id,
      xtermRef,
      clearTerminal,
      setSelectedTerminalText,
      quickHotkeySet,
      copySelection,
    });

    const terminalTopClass = isBarVisible ? 'top-[72px]!' : 'top-10!';

    return (
      <div className={`${currentView === 'terminal' ? 'block' : 'hidden'}`}>
        <div
          className={
            `absolute inset-0 ${terminalTopClass} overflow-hidden bg-white pl-3 pr-1 ` +
            'shadow-md dark:bg-LynxNearBlack'
          }>
          <XTermCore
            id={id}
            type={type}
            ref={xtermRef}
            searchAddon={searchAddon}
            onProgress={handleProgress}
            onReady={handleTerminalReady}
            serializeAddon={serializeAddon}
          />
        </div>
      </div>
    );
  },
);

export default Terminal;
