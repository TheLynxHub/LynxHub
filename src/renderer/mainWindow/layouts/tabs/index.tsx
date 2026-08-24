import {useCardsState} from '@lynx/redux/reducers/cards';
import {sessionActions} from '@lynx/redux/reducers/session';
import {useSettingsState} from '@lynx/redux/reducers/settings';
import {tabsActions, useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch, getStore} from '@lynx/redux/store';
import {restoreSingleClosedTab} from '@lynx/utils/sessionRestoreHelper';
import {TabInfo} from '@lynx_common/types';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {AnimatePresence, Reorder, useDragControls} from 'framer-motion';
import {isEqual} from 'lodash-es';
import {memo, useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import TabItem from './Item';
import NewTab from './New';
import {useRemoveTab} from './utils';

type ReorderableTabItemProps = {
  tab: TabInfo;
  isOrdering: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleReorderEnd: () => void;
};

const ReorderableTabItem = memo(({tab, isOrdering, containerRef, handleReorderEnd}: ReorderableTabItemProps) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      transition={{
        layout: {duration: 0.2, type: 'spring', bounce: 0, visualDuration: 0.2},
      }}
      animate={{
        scale: 1,
        translateY: 0,
        opacity: 1,
        transition: {duration: 0.2, ease: 'backOut'},
      }}
      className={
        'h-full flex items-center notDraggable ' +
        (tab.isPinned || tab.showIconOnly ? 'shrink-0 min-w-fit w-9' : 'w-60 basis-60 min-w-9 max-w-60 shrink flex-1')
      }
      as="div"
      key={tab.id}
      value={tab.id}
      dragElastic={0}
      layout="position"
      dragMomentum={false}
      data-tab-id={tab.id}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={handleReorderEnd}
      dragConstraints={containerRef}
      initial={{scale: 0.95, translateY: 5, opacity: 0.5}}
      exit={{scale: 0.95, translateY: 5, transition: {duration: 0.1, ease: 'backIn'}}}>
      <TabItem tab={tab} isOrdering={isOrdering} dragControls={dragControls} />
    </Reorder.Item>
  );
});

/**
 * Container component for the tabs list.
 * Handles dynamic tab shrinking, drag-and-drop reordering, context menu interactions, and rendering of individual tabs.
 */
const TabsList = memo(() => {
  const dispatch = useDispatch<AppDispatch>();

  const tabsFromRedux = useTabsState('tabs');
  const activeTab = useTabsState('activeTab');
  const runningCards = useCardsState('runningCard');
  const closeTabConfirm = useSettingsState('closeTabConfirm');
  const removeTab = useRemoveTab();

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

  // Scroll active tab into view when active tab changes
  useEffect(() => {
    if (activeTab && containerRef.current) {
      const activeElement = containerRef.current.querySelector(`[data-tab-id="${activeTab}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'nearest'});
      }
    }
  }, [activeTab]);

  // Handle horizontal mouse wheel scrolling over the tabs container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY !== 0 && !event.shiftKey) {
        event.preventDefault();
        container.scrollLeft += event.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, {passive: false});
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

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
        const tabEl = containerRef.current?.querySelector(`[data-tab-id="${tabId}"]`);
        const rect = tabEl?.getBoundingClientRect();
        const customPosition = rect ? {x: Math.floor(rect.x), y: Math.floor(rect.bottom + 4)} : undefined;
        contextMenuIpc.send.openTerminateTab(tabId, customPosition);
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

    const offReopenClosed = contextMenuIpc.on.tabActionReopenClosed(() => {
      const store = getStore();
      const recentlyClosed = store.getState().session.recentlyClosedTabs;
      if (recentlyClosed && recentlyClosed.length > 0) {
        const toRestore = recentlyClosed[0];
        dispatch(sessionActions.popClosedTab());
        restoreSingleClosedTab(toRestore, dispatch);
      }
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
      offReopenClosed();
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

  const containerClasses =
    'h-full items-center pt-1 flex flex-row pl-1 gap-x-1 relative max-w-[calc(100%-140px)] min-w-0 overflow-hidden';

  const groupClasses = 'items-center h-full flex flex-row overflow-y-hidden overflow-x-auto scrollbar-hide min-w-0';

  return (
    <div className={containerClasses}>
      <Reorder.Group
        axis="x"
        as="div"
        ref={containerRef}
        onReorder={onReorder}
        className={groupClasses}
        onMouseUp={handleReorderEnd}
        values={localTabs.map(tab => tab.id)}>
        <AnimatePresence mode="popLayout">
          {localTabs.map(tab => (
            <ReorderableTabItem
              tab={tab}
              key={tab.id}
              isOrdering={isOrdering}
              containerRef={containerRef}
              handleReorderEnd={handleReorderEnd}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      <NewTab />
    </div>
  );
});

export default TabsList;
