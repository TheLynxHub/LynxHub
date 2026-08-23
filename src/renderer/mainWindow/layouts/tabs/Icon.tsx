import {Avatar, Spinner} from '@heroui/react';
import {extensionsData} from '@lynx/plugins/extensions/loader';
import {Terminal_Icon} from '@lynx_assets/icons';
import {
  AgentPage_Icon,
  AudioPage_Icon,
  DashboardPage_Icon,
  GamePage_Icon,
  HomePage_Icon,
  ImagePage_Icon,
  OthersPage_Icon,
  PluginPage_Icon,
  SettingPage_Icon,
  TextPage_Icon,
  ToolsPage_Icon,
} from '@lynx_assets/icons/pages';
import {APP_ICON_TRANSPARENT, PageID} from '@lynx_common/consts';
import {TabInfo} from '@lynx_common/types';
import {getCacheUrl} from '@lynx_common/utils';
import {EarthIcon} from '@solar-icons/react/bold-duotone';
import {AnimatePresence, motion, MotionProps} from 'framer-motion';
import {memo, useCallback, useEffect, useMemo, useState} from 'react';

type Props = {tab: TabInfo; currentView: 'browser' | 'terminal' | undefined};

const iconTransition: MotionProps = {
  initial: {opacity: 0, scale: 0.6},
  animate: {opacity: 1, scale: 1},
  exit: {opacity: 0, scale: 0.6},
  transition: {duration: 0.15, ease: 'easeOut'},
};

/**
 * Helper to get the icon component based on page ID.
 */
const getPageIcon = (pageID: string) => {
  switch (pageID) {
    case PageID.home:
      return <HomePage_Icon className="size-full" />;
    case PageID.imageGen:
      return <ImagePage_Icon className="size-full" />;
    case PageID.textGen:
      return <TextPage_Icon className="size-full" />;
    case PageID.audioGen:
      return <AudioPage_Icon className="size-full" />;
    case PageID.agents:
      return <AgentPage_Icon className="size-full" />;
    case PageID.others:
      return <OthersPage_Icon className="size-full" />;
    case PageID.games:
      return <GamePage_Icon className="size-full" />;
    case PageID.tools:
      return <ToolsPage_Icon className="size-full" />;
    case PageID.dashboard:
      return <DashboardPage_Icon className="size-full" />;
    case PageID.plugins:
      return <PluginPage_Icon className="size-full" />;
    case PageID.settings:
      return <SettingPage_Icon className="size-full" />;
    default: {
      const customPage = (extensionsData.router.pages || []).find(p => p.id === pageID);
      if (customPage) {
        return customPage.icon;
      }
      return (
        <Avatar className="size-4 bg-transparent rounded-none">
          <Avatar.Image src={APP_ICON_TRANSPARENT} />
        </Avatar>
      );
    }
  }
};

/**
 * Component to display the icon for a tab.
 * Handles favicons, internal page icons, loading states, and terminal icons.
 */
const TabIcon = memo(({tab, currentView}: Props) => {
  const [imgError, setImgError] = useState(false);
  const favIconUrl = tab.favIcon.url;

  // Reset error state when favicon URL changes
  useEffect(() => {
    setImgError(false);
  }, [favIconUrl]);

  const handleImgError = useCallback(() => setImgError(true), []);

  const icon = useMemo(() => {
    const {favIcon, pageID, title} = tab;

    // Use lynxcache:// protocol for favicon caching, fallback to Web_Icon on error
    if (favIcon.show && favIcon.url && !imgError) {
      return (
        <Avatar className="size-4 rounded-none bg-transparent">
          <Avatar.Image alt={title} onError={handleImgError} src={getCacheUrl(favIcon.url)} />
          <Avatar.Fallback className="bg-transparent">
            <EarthIcon />
          </Avatar.Fallback>
        </Avatar>
      );
    }

    if (currentView === 'browser') {
      return <EarthIcon className="size-full" />;
    }

    return getPageIcon(pageID);
  }, [tab, currentView, imgError, handleImgError]);

  const iconState = useMemo(() => {
    if (tab.isTerminal && currentView === 'terminal') return 'terminal';
    if (tab.isLoading) return 'loading';
    return 'icon';
  }, [tab.isTerminal, tab.isLoading, currentView]);

  return (
    <div className="relative shrink-0 size-4 flex items-center justify-center">
      <AnimatePresence mode="popLayout">
        {iconState === 'terminal' && (
          <motion.div key="terminal" className="absolute inset-0 flex items-center justify-center" {...iconTransition}>
            <Terminal_Icon className="size-full" />
          </motion.div>
        )}
        {iconState === 'loading' && (
          <motion.div key="loading" className="absolute inset-0 flex items-center justify-center" {...iconTransition}>
            <Spinner size="sm" color="accent" />
          </motion.div>
        )}
        {iconState === 'icon' && (
          <motion.div key="icon" className="absolute inset-0 flex items-center justify-center" {...iconTransition}>
            {icon}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default TabIcon;
