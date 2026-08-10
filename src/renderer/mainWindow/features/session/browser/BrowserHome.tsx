import {Button, ScrollShadow, Spinner, Surface} from '@heroui/react';
import {cardsActions} from '@lynx/redux/reducers/cards';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {Terminal_Icon} from '@lynx_assets/icons';
import {History_Color_Icon} from '@lynx_assets/icons/Icons_Colorful';
import {FavIcons} from '@lynx_common/types/ipc';
import {StarIcon} from '@solar-icons/react/bold';
import {AnimatePresence, motion} from 'framer-motion';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {triggerActions, useTriggerState} from '../../../redux/reducers/triggers';
import HistorySection from './HistorySection';
import {getCachedHistoryData} from './utils';

type Props = {type: 'browser' | 'terminal' | 'both'};

const MotionSurface = motion.create(Surface);

const fadeIn = {
  hidden: {opacity: 0},
  visible: {opacity: 1, transition: {duration: 0.2}},
};

const staggerContainer = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {staggerChildren: 0.03, delayChildren: 0.05},
  },
};

export default function BrowserHome({type}: Props) {
  const activeTab = useTabsState('activeTab');
  const reloadBrowserHomePage = useTriggerState('reloadBrowserHomePage');
  const dispatch = useDispatch<AppDispatch>();

  const [recentAddress, setRecentAddress] = useState<string[]>([]);
  const [favoriteAddress, setFavoriteAddress] = useState<string[]>([]);
  const [favIcons, setFavIcons] = useState<FavIcons[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const switchToTerminal = useCallback(() => {
    dispatch(cardsActions.setRunningCardView({tabId: activeTab, view: 'terminal'}));
  }, [dispatch, activeTab]);

  const handleDataRefresh = useCallback(
    (result: {favoriteAddress: string[]; recentAddress: string[]; favIcons: FavIcons[]}) => {
      if (!mountedRef.current) return;
      setFavoriteAddress(result.favoriteAddress);
      setRecentAddress(result.recentAddress);
      setFavIcons(result.favIcons);
    },
    [],
  );

  const reloadPage = useCallback(() => {
    setIsLoading(true);

    getCachedHistoryData().then(result => {
      handleDataRefresh(result);
      setIsLoading(false);
    });
  }, [handleDataRefresh]);

  useEffect(() => {
    if (reloadBrowserHomePage) {
      reloadPage();
      dispatch(triggerActions.clear('reloadBrowserHomePage'));
    }
  }, [reloadBrowserHomePage, reloadPage]);

  useEffect(() => {
    mountedRef.current = true;
    reloadPage();

    return () => {
      mountedRef.current = false;
    };
  }, [reloadPage]);

  // Create a map for quick favicon lookup
  const favIconMap = useMemo(() => {
    const map = new Map<string, FavIcons>();
    for (const fav of favIcons) {
      map.set(fav.url, fav);
    }
    return map;
  }, [favIcons]);

  if (isLoading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Spinner size="lg" color="current" />
      </div>
    );
  }

  return (
    <ScrollShadow className="size-full">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="mx-auto flex max-w-7xl flex-col gap-5 p-5 md:p-6 lg:p-8">
        <AnimatePresence>
          {type === 'both' && (
            <MotionSurface
              variants={fadeIn}
              variant="secondary"
              exit={{opacity: 0}}
              className={'flex flex-col items-center rounded-3xl px-6 py-8 text-center'}>
              <Spinner size="xl" color="accent" />
              <span className="text-xs text-muted">Waiting for address...</span>

              <div className="my-3" />

              <Button onPress={switchToTerminal}>
                <Terminal_Icon className="size-4" />
                Switch to Terminal
              </Button>
            </MotionSurface>
          )}
        </AnimatePresence>

        <HistorySection
          title="Favorites"
          itemType="favorite"
          data={favoriteAddress}
          favIconMap={favIconMap}
          emptyTitle="No favorites yet"
          onRefresh={handleDataRefresh}
          emptyDescription="Star sites to add them here"
          subtitle="Quick access to your bookmarked sites"
          icon={<StarIcon className="size-10 text-amber-500" />}
        />

        <HistorySection
          title="Recent"
          itemType="recent"
          data={recentAddress}
          favIconMap={favIconMap}
          emptyTitle="No recent visits"
          onRefresh={handleDataRefresh}
          subtitle="Your browsing history"
          emptyDescription="Your history will appear here"
          icon={<History_Color_Icon className="size-10" id="empty_page_history" />}
        />
      </motion.div>
    </ScrollShadow>
  );
}
