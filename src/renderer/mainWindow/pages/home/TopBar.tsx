import {Button, Separator} from '@heroui/react';
import {cardsActions} from '@lynx/redux/reducers/cards';
import {tabsActions, useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {Terminal_Icon} from '@lynx_assets/icons';
import {PageID} from '@lynx_common/consts';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {ChatRound, Earth} from '@solar-icons/react-perf/BoldDuotone';
import {motion} from 'framer-motion';
import {Plus} from 'lucide-react';
import {useDispatch} from 'react-redux';

/**
 * Animated top bar component for the Home page.
 * Provides quick actions to open new terminals, browsers, or split views.
 */
export default function HomeTopBar() {
  const activeTab = useTabsState('activeTab');
  const dispatch = useDispatch<AppDispatch>();

  /**
   * Dispatches an action to open a new empty card of the specified type in the active tab.
   *
   * @param {'browser' | 'terminal' | 'both'} type The type of view to open.
   */
  const addRunningEmpty = (type: 'browser' | 'terminal' | 'both') =>
    dispatch(
      cardsActions.addRunningEmpty({
        tabId: activeTab,
        type,
      }),
    );

  const handleNewTerminal = () => {
    AddBreadcrumb_Renderer(`New Empty Terminal`);
    addRunningEmpty('terminal');
  };

  const handleNewBrowser = () => {
    AddBreadcrumb_Renderer(`New Empty Browser`);
    addRunningEmpty('browser');
  };

  const handleNewTerminalBrowser = () => {
    AddBreadcrumb_Renderer(`New Empty Terminal & Browser`);
    addRunningEmpty('both');
  };

  const handleNewOnlineChat = () => {
    AddBreadcrumb_Renderer(`New Online Chat Tab`);
    dispatch(
      tabsActions.addTab({
        id: 'online-chat',
        title: 'Online Chat',
        pageID: PageID.onlineChat,
        isLoading: false,
        isTerminal: false,
        favIcon: {show: false, url: ''},
      }),
    );
  };

  return (
    <div className="flex w-full shrink-0 flex-row items-center justify-end gap-x-3 px-6 py-3">
      <motion.div
        transition={{
          duration: 0.4,
          ease: [0.16, 1, 0.3, 1],
          staggerChildren: 0.1,
        }}
        className="flex gap-3"
        animate={{scale: 1, translateY: 0, opacity: 1}}
        initial={{scale: 0.96, translateY: -10, opacity: 0}}>
        <motion.div transition={{delay: 0.05}} animate={{opacity: 1, y: 0}} initial={{opacity: 0, y: -10}}>
          <Button size="sm" variant="tertiary" onPress={handleNewOnlineChat}>
            <ChatRound />
            Chat
          </Button>
        </motion.div>

        <Separator className="my-2" variant="secondary" orientation="vertical" />

        <motion.div transition={{delay: 0.1}} animate={{opacity: 1, y: 0}} initial={{opacity: 0, y: -10}}>
          <Button size="sm" className="w-25" variant="tertiary" onPress={handleNewTerminal}>
            <Terminal_Icon />
            Terminal
          </Button>
        </motion.div>

        <motion.div transition={{delay: 0.2}} animate={{opacity: 1, y: 0}} initial={{opacity: 0, y: -10}}>
          <Button size="sm" className="w-25" variant="tertiary" onPress={handleNewBrowser}>
            <Earth />
            Browser
          </Button>
        </motion.div>

        <motion.div transition={{delay: 0.3}} animate={{opacity: 1, y: 0}} initial={{opacity: 0, y: -10}}>
          <Button size="sm" className="w-21" onPress={handleNewTerminalBrowser}>
            <Terminal_Icon className="flex-1" />
            <Plus className="size-2.5 opacity-80" />
            <Earth className="flex-1" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
