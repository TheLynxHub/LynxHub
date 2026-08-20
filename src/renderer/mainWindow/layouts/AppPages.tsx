import BookmarksBar from '@lynx/features/bookmarks/BookmarksBar';
import {useBookmarks} from '@lynx/features/bookmarks/useBookmarks';
import SessionView from '@lynx/features/session';
import Agents from '@lynx/pages/agents';
import AudioGenerationPage from '@lynx/pages/audio';
import DashboardPage from '@lynx/pages/dashboard';
import GamesPage from '@lynx/pages/games';
import HomePage from '@lynx/pages/home';
import ImageGenerationPage from '@lynx/pages/image';
import OthersPage from '@lynx/pages/others';
import PluginsPage from '@lynx/pages/plugins';
import SettingsPage from '@lynx/pages/settings';
import TextGenerationPage from '@lynx/pages/text';
import ToolsPage from '@lynx/pages/tools';
import {extensionsData} from '@lynx/plugins/extensions/loader';
import {useCardsState} from '@lynx/redux/reducers/cards';
import {useTerminalState} from '@lynx/redux/reducers/terminal';
import {PageID} from '@lynx_common/consts';
import ptyIpc from '@lynx_shared/ipc/pty';
import {ComponentType, memo, useEffect, useMemo} from 'react';

import {useRemoveTab} from './tabs/utils';

const PageComponents = {
  [PageID.home]: HomePage,
  [PageID.imageGen]: ImageGenerationPage,
  [PageID.textGen]: TextGenerationPage,
  [PageID.audioGen]: AudioGenerationPage,
  [PageID.tools]: ToolsPage,
  [PageID.games]: GamesPage,
  [PageID.others]: OthersPage,
  [PageID.agents]: Agents,
  [PageID.dashboard]: DashboardPage,
  [PageID.plugins]: PluginsPage,
  [PageID.settings]: SettingsPage,
};

type Props = {tabID: string; pageID: string};

/**
 * Component that renders the content of the active tab.
 * It maps through all tabs and renders either the session view (browser/terminal) or the internal page.
 */
const AppPages = memo(({tabID, pageID}: Props) => {
  const runningCards = useCardsState('runningCard');
  const closeTabOnExit = useTerminalState('closeTabOnExit');
  const {visibility} = useBookmarks();

  const isAlwaysBar = visibility === 'always';
  const foundRunningCard = runningCards.find(card => card.tabId === tabID);

  const removeTab = useRemoveTab();

  const RunningView = useMemo(() => {
    const Container = extensionsData.runningAI.container;
    return Container ? Container : SessionView;
  }, []);

  // Handle PTY exit events
  useEffect(() => {
    const removeListener = ptyIpc.onExit(id => {
      if (closeTabOnExit) removeTab({id});
    });

    return () => removeListener();
  }, [closeTabOnExit, removeTab]);

  if (foundRunningCard) return <RunningView runningCard={foundRunningCard} />;

  const renderPageComponent = () => {
    const customPage = (extensionsData.router.pages || []).find(p => p.id === pageID);
    if (customPage) {
      const Component = customPage.component as ComponentType<{tabID?: string}>;
      return <Component tabID={tabID} />;
    }

    const routerReplace = extensionsData.router.replace;
    const ReplacedComponent = {
      [PageID.home]: routerReplace.homePage,
      [PageID.imageGen]: routerReplace.imageGenerationPage,
      [PageID.textGen]: routerReplace.textGenerationPage,
      [PageID.audioGen]: routerReplace.audioGenerationPage,
      [PageID.tools]: routerReplace.toolsPage,
      [PageID.games]: routerReplace.gamesPage,
      [PageID.dashboard]: routerReplace.dashboardPage,
      [PageID.plugins]: routerReplace.extensionsPage,
      [PageID.settings]: routerReplace.settingsPage,
    }[pageID] as ComponentType<{tabID?: string}> | undefined;

    if (ReplacedComponent) {
      return <ReplacedComponent tabID={tabID} />;
    }

    const Component = (PageComponents[pageID] || HomePage) as ComponentType<{tabID?: string}>;
    return <Component tabID={tabID} />;
  };

  return (
    <div className="flex flex-col size-full overflow-hidden">
      {isAlwaysBar && <BookmarksBar />}
      <div className="flex-1 size-full overflow-hidden relative">{renderPageComponent()}</div>
    </div>
  );
});

export default AppPages;
