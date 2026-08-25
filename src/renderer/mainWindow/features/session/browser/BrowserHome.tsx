import {Button, ScrollShadow, Spinner, Surface} from '@heroui/react';
import EmptyStateCard from '@lynx/components/EmptyStateCard';
import {cardsActions} from '@lynx/redux/reducers/cards';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {Terminal_Icon} from '@lynx_assets/icons';
import {History_Color_Icon} from '@lynx_assets/icons/Icons_Colorful';
import {BookmarkItem as BookmarkItemType} from '@lynx_common/types/bookmarks';
import {FavIcons} from '@lynx_common/types/ipc';
import {BookmarkIcon} from '@solar-icons/react/bold-duotone';
import {AnimatePresence, motion} from 'framer-motion';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {triggerActions, useTriggerState} from '../../../redux/reducers/triggers';
import {useBookmarks} from '../../bookmarks/useBookmarks';
import BookmarkCard from './BookmarkCard';
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

const itemFade = {
  hidden: {opacity: 0, y: 6},
  visible: {opacity: 1, y: 0, transition: {duration: 0.2}},
};

export default function BrowserHome({type}: Props) {
  const activeTab = useTabsState('activeTab');
  const reloadBrowserHomePage = useTriggerState('reloadBrowserHomePage');
  const dispatch = useDispatch<AppDispatch>();
  const {all} = useBookmarks();

  const [recentAddress, setRecentAddress] = useState<string[]>([]);
  const [favIcons, setFavIcons] = useState<FavIcons[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const bookmarksList = useMemo(
    () => all.filter((b): b is BookmarkItemType => b.type === 'bookmark' && !!b.url),
    [all],
  );

  const switchToTerminal = useCallback(() => {
    dispatch(cardsActions.setRunningCardView({tabId: activeTab, view: 'terminal'}));
  }, [dispatch, activeTab]);

  const handleDataRefresh = useCallback(
    (result: {favoriteAddress: string[]; recentAddress: string[]; favIcons: FavIcons[]}) => {
      if (!mountedRef.current) return;
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

        {/* Bookmarks Section */}
        {bookmarksList.length > 0 ? (
          <motion.section variants={fadeIn} className="w-full">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-surface-secondary p-2.5">
                <BookmarkIcon className="size-10 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Bookmarks</h2>
                <p className="text-xs text-muted">Quick access to your saved pages</p>
              </div>
            </div>

            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-wrap gap-4">
              <AnimatePresence mode="popLayout">
                {bookmarksList.slice(0, 18).map(bookmark => (
                  <motion.div
                    initial="hidden"
                    key={bookmark.id}
                    layout="position"
                    animate="visible"
                    variants={itemFade}
                    exit={{opacity: 0, scale: 0.8, transition: {duration: 0.15}}}
                    transition={{layout: {type: 'spring', stiffness: 500, damping: 30}}}>
                    <BookmarkCard bookmark={bookmark} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.section>
        ) : (
          <motion.div variants={fadeIn}>
            <EmptyStateCard
              icon={
                <div className="mb-4 flex justify-center opacity-60">
                  <BookmarkIcon className="size-10 text-accent" />
                </div>
              }
              variant="secondary"
              bodyClassName="gap-y-0 px-6 py-12"
              title={<h3 className="text-base font-medium text-semi-muted">No bookmarks yet</h3>}
              description={<p className="text-sm text-muted">Bookmark sites to quickly access them here</p>}
            />
          </motion.div>
        )}

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
