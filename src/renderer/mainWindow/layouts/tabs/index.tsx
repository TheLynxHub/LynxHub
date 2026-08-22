import {Separator} from '@heroui/react';
import {useCardsState} from '@lynx/redux/reducers/cards';
import {useSettingsState} from '@lynx/redux/reducers/settings';
import {tabsActions, useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {TabInfo} from '@lynx_common/types';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {AnimatePresence, Reorder} from 'framer-motion';
import {isEqual} from 'lodash-es';
import {memo, useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {useAppState} from '../../redux/reducers/app';
import TabItem from './Item';
import NewTab from './New';
import {useRemoveTab} from './utils';

/**
 * Container component for the tabs list.
 * Handles drag-and-drop reordering, context menu interactions, and rendering of individual tabs.
 */
const TabsList = memo(() => {
  const dispatch = useDispatch<AppDispatch>();

  const tabsFromRedux = useTabsState('tabs');
  const activeTab = useTabsState('activeTab');
  const runningCards = useCardsState('runningCard');
  const closeTabConfirm = useSettingsState('closeTabConfirm');
  const removeTab = useRemoveTab();
  const onFocus = useAppState('onFocus');

  const [localTabs, setLocalTabs] = useState<TabInfo[]>(tabsFromRedux);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevTabRef = useRef<string>(activeTab);

  // Log active tab switch centrally (covers click, keyboard shortcuts, etc.)
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      const targetTab = tabsFromRedux.find(t => t.id === activeTab);
      if (targetTab) {
        AddBreadcrumb_Renderer(`Tabs: Switch to tab: ${targetTab.title}`);
      }
      prevTabRef.current = activeTab;
    }
  }, [activeTab, tabsFromRedux]);

  const [isOrdering, setIsOrdering] = useState<boolean>(false);

  // Sync local state with Redux when Redux state changes (e.g. new tab added from elsewhere)
  useEffect(() => {
    setLocalTabs(tabsFromRedux);
  }, [tabsFromRedux]);

  // Prevent default middle-click scrolling behavior on the tab container
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const handleMouseDown = (event: MouseEvent) => {
        if (event.button === 1) {
          event.preventDefault();
        }
      };
      container.addEventListener('mousedown', handleMouseDown);
      return () => container.removeEventListener('mousedown', handleMouseDown);
    }
    return undefined;
  }, []);

  // Listen for tab context menu events
  useEffect(() => {
    const offRemoveTab = contextMenuIpc.on.removeTab(tabId => {
      removeTab({tabId});
    });

    const offClose = contextMenuIpc.on.tabActionClose(tabId => {
      const running = runningCards.find(card => card.tabId === tabId);
      if (running && running.type !== 'browser' && closeTabConfirm) {
        contextMenuIpc.send.openTerminateTab(tabId);
      } else {
        removeTab({tabId});
      }
    });

    const offPin = contextMenuIpc.on.tabActionPin(tabId => {
      dispatch(tabsActions.togglePinTab(tabId));
    });

    const offIconOnly = contextMenuIpc.on.tabActionIconOnly(tabId => {
      dispatch(tabsActions.toggleTabIconOnly(tabId));
    });

    const offForceClose = contextMenuIpc.on.tabActionForceClose(tabId => {
      removeTab({tabId});
    });

    const offCloseOthers = contextMenuIpc.on.tabActionCloseOthers(tabId => {
      const toRemove = tabsFromRedux.filter(t => !t.isPinned && t.id !== tabId);
      if (toRemove.length === 0) return;

      const runningCount = toRemove.filter(t =>
        runningCards.some(card => card.tabId === t.id && card.type !== 'browser'),
      ).length;

      if (runningCount > 0 && closeTabConfirm) {
        contextMenuIpc.send.openTerminateMultipleTabs({
          tabIds: toRemove.map(t => t.id),
          count: toRemove.length,
          runningCount,
        });
      } else {
        toRemove.forEach(t => removeTab({tabId: t.id}));
      }
    });

    const offCloseRight = contextMenuIpc.on.tabActionCloseRight(tabId => {
      const targetIndex = tabsFromRedux.findIndex(t => t.id === tabId);
      if (targetIndex === -1) return;

      const toRemove = tabsFromRedux.slice(targetIndex + 1).filter(t => !t.isPinned);
      if (toRemove.length === 0) return;

      const runningCount = toRemove.filter(t =>
        runningCards.some(card => card.tabId === t.id && card.type !== 'browser'),
      ).length;

      if (runningCount > 0 && closeTabConfirm) {
        contextMenuIpc.send.openTerminateMultipleTabs({
          tabIds: toRemove.map(t => t.id),
          count: toRemove.length,
          runningCount,
        });
      } else {
        toRemove.forEach(t => removeTab({tabId: t.id}));
      }
    });

    const offRemoveMultiple = contextMenuIpc.on.removeMultipleTabs(tabIds => {
      tabIds.forEach(id => removeTab({tabId: id}));
    });

    return () => {
      offRemoveTab();
      offClose();
      offPin();
      offIconOnly();
      offForceClose();
      offCloseOthers();
      offCloseRight();
      offRemoveMultiple();
    };
  }, [removeTab, tabsFromRedux, runningCards, closeTabConfirm, dispatch]);

  const onReorder = useCallback((reorderedIds: string[]) => {
    setIsOrdering(true);
    setLocalTabs(prevTabs => {
      const newOrder = reorderedIds
        .map(tabID => prevTabs.find(tab => tab.id === tabID))
        .filter((tab): tab is TabInfo => tab !== undefined);

      // Maintain pinned tabs partition at front
      const pinned = newOrder.filter(t => t.isPinned);
      const unpinned = newOrder.filter(t => !t.isPinned);
      const combined = [...pinned, ...unpinned];

      return combined.length === prevTabs.length ? combined : prevTabs;
    });
  }, []);

  const handleReorderEnd = useCallback(() => {
    setTimeout(() => setIsOrdering(false), 100);
    if (!isEqual(tabsFromRedux, localTabs)) {
      dispatch(tabsActions.reorderTabs(localTabs));
    }
  }, [tabsFromRedux, localTabs, dispatch]);

  return (
    <div
      className={
        'h-full items-center pt-1 notDraggable justify-between overflow-hidden flex flex-row pl-1 gap-x-1 relative'
      }>
      <Reorder.Group
        axis="x"
        as="div"
        ref={containerRef}
        onReorder={onReorder}
        onMouseUp={handleReorderEnd}
        values={localTabs.map(tab => tab.id)}
        className="items-center h-full w-full flex flex-row overflow-y-hidden overflow-x-scroll scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {localTabs.map((tab, index) => (
            <Reorder.Item
              transition={{
                layout: {duration: 0.2, type: 'spring', bounce: 0, visualDuration: 0.2},
              }}
              className={
                'h-full flex items-center ' + (tab.isPinned || tab.showIconOnly ? 'min-w-fit' : 'max-w-60 min-w-24')
              }
              animate={{
                scale: 1,
                translateY: 0,
                opacity: 1,
                transition: {duration: 0.25, ease: 'backOut'},
              }}
              as="div"
              key={tab.id}
              value={tab.id}
              layout="position"
              initial={{scale: 0.9, translateY: 10, opacity: 0}}
              exit={{scale: 0.9, translateY: 10, transition: {duration: 0.07, ease: 'backIn'}}}>
              <TabItem tab={tab} isOrdering={isOrdering} />
              {index < localTabs.length - 1 && (
                <Separator orientation="vertical" className={`mx-1 my-3`} variant={onFocus ? 'tertiary' : 'default'} />
              )}
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      <NewTab />
    </div>
  );
});

export default TabsList;
