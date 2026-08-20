import {extensionsData} from '@lynx/plugins/extensions/loader';
import {useAllCardDataWithPath} from '@lynx/plugins/modules';
import {cardsActions} from '@lynx/redux/reducers/cards';
import {tabsActions, useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {RunningCard} from '@lynx/types';
import {toMs} from '@lynx_common/utils';
import applicationIpc from '@lynx_shared/ipc/application';
import ptyIpc from '@lynx_shared/ipc/pty';
import storageIpc, {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import {SearchAddon} from '@xterm/addon-search';
import {SerializeAddon} from '@xterm/addon-serialize';
import {isNil} from 'lodash-es';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {XTermAPI} from '../../components/useXTerm';
import BookmarksBar from '../bookmarks/BookmarksBar';
import Browser from './browser';
import Terminal from './terminal';
import SessionTopBar from './topBar';

type Props = {
  /**
   * The running card data.
   */
  runningCard: RunningCard;
};

/**
 * The main session view component.
 * Manages the layout between browser and terminal views, handles title updates, and custom run behaviors.
 */
const SessionView = ({runningCard}: Props) => {
  const {currentView, id, tabId, isEmptyRunning, browserTitle} = runningCard;

  const ExtTerminal = useMemo(() => extensionsData.runningAI.terminal, []);
  const ExtBrowser = useMemo(() => extensionsData.runningAI.browser, []);

  const allCardsData = useAllCardDataWithPath();

  const activeTab = useTabsState('activeTab');
  const tabs = useTabsState('tabs');
  const dispatch = useDispatch<AppDispatch>();

  const [terminalName, setTerminalName] = useState<string>('');

  const customUrlTimeout = useRef<NodeJS.Timeout>(undefined);

  // Sync tab isTerminal state
  useEffect(() => {
    if (tabId === activeTab) {
      const isBrowserView = currentView === 'browser';
      dispatch(tabsActions.setTabIsTerminal({tabID: tabId, isTerminal: !isBrowserView}));
    }
  }, [tabId, currentView, activeTab, dispatch]);

  // Listen for terminal title changes
  useEffect(() => {
    const offTitle = ptyIpc.onTitle((targetID, title) => {
      if (targetID === id) setTerminalName(title);
    });

    return () => offTitle();
  }, [id]);

  // Update tab title
  useEffect(() => {
    const isBrowserView = currentView === 'browser';
    const terminalTitle = isEmptyRunning ? terminalName : allCardsData.find(card => card.id === id)?.title;
    const title = isBrowserView ? browserTitle : terminalTitle;
    const currentTitle = tabs.find(tab => tab.id === activeTab)?.title;

    if (title && title !== currentTitle) {
      dispatch(tabsActions.setTabTitle({title, tabID: tabId}));
    }
  }, [isEmptyRunning, id, tabId, currentView, activeTab, terminalName, browserTitle]);

  // Handle custom run behavior (URL catch)
  useEffect(() => {
    let isMounted = true;

    storageIpc.get('cardsConfig').then(result => {
      if (!isMounted) return;

      const custom = result.customRunBehavior.find(customRun => customRun.cardID === id);
      if (custom && custom.urlCatch.type === 'custom' && custom.urlCatch.customUrl) {
        const url = custom.urlCatch.customUrl;
        customUrlTimeout.current = setTimeout(
          () => {
            if (custom.browser === 'appBrowser') {
              dispatch(cardsActions.setRunningCardAddress({address: url, tabId: activeTab}));
              dispatch(cardsActions.setRunningCardView({view: 'browser', tabId: activeTab}));
              storageUtilsIpc.send.addBrowserRecent(url);
            } else {
              applicationIpc.send.openUrlDefaultBrowser(url);
            }
          },
          toMs(custom.urlCatch.delay, 'seconds'),
        );
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(customUrlTimeout.current);
      customUrlTimeout.current = undefined;
    };
  }, [id, activeTab, dispatch]);

  const [serializeAddon] = useState<SerializeAddon>(new SerializeAddon());
  const [searchAddon] = useState<SearchAddon>(new SearchAddon());
  const [selectedTerminalText, setSelectedTerminalText] = useState<string>('');
  const xtermRef = useRef<XTermAPI | null>(null);
  const clearTerminal = useRef<(() => void) | undefined>(undefined);

  const showTerminal = runningCard.type !== 'browser';
  const showBrowser = runningCard.type !== 'terminal';

  return (
    <>
      <SessionTopBar
        tabID={tabId}
        xtermRef={xtermRef}
        runningCard={runningCard}
        searchAddon={searchAddon}
        clearTerminal={clearTerminal}
        serializeAddon={serializeAddon}
        selectedTerminalText={selectedTerminalText}
      />
      <BookmarksBar runningCard={runningCard} />
      {showTerminal &&
        (isNil(ExtTerminal) ? (
          <Terminal
            xtermRef={xtermRef}
            runningCard={runningCard}
            searchAddon={searchAddon}
            clearTerminal={clearTerminal}
            serializeAddon={serializeAddon}
            setSelectedTerminalText={setSelectedTerminalText}
          />
        ) : (
          <ExtTerminal />
        ))}
      {showBrowser && (isNil(ExtBrowser) ? <Browser runningCard={runningCard} /> : <ExtBrowser />)}
    </>
  );
};

export default SessionView;
