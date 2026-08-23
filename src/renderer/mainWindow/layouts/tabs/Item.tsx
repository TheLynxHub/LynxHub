import {CloseButton, Tooltip} from '@heroui/react';
import useHotkeyPress from '@lynx/hooks/hotkeys';
import {useCardsState} from '@lynx/redux/reducers/cards';
import {useHotkeysState} from '@lynx/redux/reducers/hotkeys';
import {useSessionState} from '@lynx/redux/reducers/session';
import {useSettingsState} from '@lynx/redux/reducers/settings';
import {tabsActions, useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {Hotkey_Names} from '@lynx_common/consts/hotkeys';
import {TabInfo} from '@lynx_common/types';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {DragControls} from 'framer-motion';
import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import AudioIndicator from './AudioIndicator';
import TabIcon from './Icon';
import ProgressBar from './ProgressBar';
import TabTitle from './Title';
import {useIsActiveTab, useRemoveTab} from './utils';

type Props = {
  tab: TabInfo;
  isOrdering: boolean;
  dragControls?: DragControls;
};

/**
 * Component representing a single tab in the tab bar.
 * Handles selection, closing, and drag interactions.
 */
const TabItem = memo(({tab, isOrdering, dragControls}: Props) => {
  const isCtrlPressed = useHotkeysState('isCtrlPressed');
  const isActiveTab = useIsActiveTab(tab.id);
  const runningCards = useCardsState('runningCard');
  const tabs = useTabsState('tabs');
  const activeTab = useTabsState('activeTab');
  const btnRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [isTruncated, setIsTruncated] = useState<boolean>(false);

  const [isHovered, setIsHovered] = useState<boolean>(false);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const closeTabConfirm = useSettingsState('closeTabConfirm');

  const removeTab = useRemoveTab();

  const isCompact = Boolean(tab.isPinned || tab.showIconOnly);
  const tabIndex = useMemo(() => tabs.findIndex(t => t.id === tab.id), [tabs, tab.id]);
  const isNextActive = useMemo(() => {
    const next = tabs[tabIndex + 1];
    return next ? next.id === activeTab : false;
  }, [tabs, tabIndex, activeTab]);
  const isLastTab = tabIndex === tabs.length - 1;
  const showDivider = !isActiveTab && !isHovered && !isNextActive && !isLastTab;

  const canCloseOthers = useMemo(() => tabs.filter(t => !t.isPinned && t.id !== tab.id).length > 0, [tabs, tab.id]);
  const canCloseRight = useMemo(
    () => tabIndex !== -1 && tabs.slice(tabIndex + 1).some(t => !t.isPinned),
    [tabs, tabIndex],
  );

  const runningCard = useMemo(() => runningCards.find(card => card.tabId === tab.id), [runningCards, tab.id]);

  const handleRemove = useCallback(
    (isHotkey: boolean) => {
      const tabId = tab.id;

      if (runningCard) {
        if (runningCard.type === 'browser') {
          removeTab({tabId});
        } else {
          if ((isCtrlPressed && !isHotkey) || !closeTabConfirm) {
            removeTab({tabId});
          } else {
            const bounds = closeBtnRef.current?.getBoundingClientRect();
            if (bounds && isHotkey) {
              contextMenuIpc.send.openTerminateTab(tabId, {x: bounds.x, y: bounds.y});
            } else {
              contextMenuIpc.send.openTerminateTab(tabId);
            }
          }
        }
      } else {
        removeTab({tabId});
      }
    },
    [tab.id, runningCard, isCtrlPressed, closeTabConfirm, removeTab],
  );

  const handleAuxClick = useCallback(
    (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        handleRemove(false);
      }
    },
    [handleRemove],
  );

  const recentlyClosedTabs = useSessionState('recentlyClosedTabs');
  const canReopenClosedTab = recentlyClosedTabs.length > 0;

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      contextMenuIpc.send.openTabContextMenu(
        {
          tabId: tab.id,
          title: tab.title,
          isPinned: Boolean(tab.isPinned),
          showIconOnly: Boolean(tab.showIconOnly),
          canCloseOthers,
          canCloseRight,
          isOnlyTab: tabs.length <= 1,
          hasRunningCard: Boolean(runningCard),
          canReopenClosedTab,
        },
        {x: e.clientX, y: e.clientY},
      );
    },
    [
      tab.id,
      tab.title,
      tab.isPinned,
      tab.showIconOnly,
      canCloseOthers,
      canCloseRight,
      tabs.length,
      runningCard,
      canReopenClosedTab,
    ],
  );

  useHotkeyPress([{name: Hotkey_Names.closeTab, method: isActiveTab ? () => handleRemove(true) : null}]);

  useEffect(() => {
    const btn = btnRef.current;
    if (btn) {
      btn.addEventListener('auxclick', handleAuxClick);
    }

    return () => {
      if (btn) {
        btn.removeEventListener('auxclick', handleAuxClick);
      }
    };
  }, [handleAuxClick]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-tab-close]') || target?.closest('[data-tab-audio]') || target?.closest('button')) {
        return;
      }
      dragControls?.start(e);
    },
    [dragControls],
  );

  const handleTabClick = useCallback(
    (e: React.MouseEvent) => {
      if (isOrdering) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-tab-close]') || target?.closest('[data-tab-audio]') || target?.closest('button')) {
        return;
      }
      dispatch(tabsActions.setActiveTab(tab.id));
    },
    [dispatch, tab.id, isOrdering],
  );

  const stopPropagation = useCallback((e: React.SyntheticEvent | Event) => {
    e.stopPropagation();
  }, []);

  const isTooltipDisabled = isOrdering || (!isTruncated && !isCompact);
  const isCloseVisible = isActiveTab || isHovered;

  const buttonClasses =
    'text-sm flex flex-row relative w-full h-9 overflow-hidden rounded-none rounded-t-xl! ' +
    'cursor-default select-none transition-colors duration-150 px-2 ' +
    (tab.isPinned ? 'justify-center ' : 'justify-start ') +
    (isActiveTab
      ? 'bg-white dark:bg-[#303033] shadow-xs text-foreground'
      : 'text-foreground/80 hover:text-foreground hover:bg-surface-secondary/70');

  const closeWrapperClasses =
    'absolute right-0 top-0 bottom-0 z-10 flex items-center pr-1 pl-4 pointer-events-none ' +
    'transition-opacity duration-150 ' +
    (isActiveTab
      ? 'opacity-100 bg-gradient-to-l from-white dark:from-[#303033] ' +
        'via-white/90 dark:via-[#303033]/90 to-transparent'
      : isHovered
        ? 'opacity-100 bg-gradient-to-l from-surface-secondary via-surface-secondary/90 to-transparent'
        : 'opacity-0');

  const dividerClasses =
    'absolute right-0 top-2.5 bottom-2.5 w-px bg-border-secondary transition-opacity ' +
    'duration-150 pointer-events-none ' +
    (showDivider ? 'opacity-100' : 'opacity-0');

  return (
    <Tooltip delay={350} isDisabled={isTooltipDisabled}>
      <Tooltip.Trigger className="w-full h-full flex items-center outline-none">
        <div
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              const target = e.target as HTMLElement | null;
              if (!target?.closest('[data-tab-close]') && !target?.closest('[data-tab-audio]')) {
                dispatch(tabsActions.setActiveTab(tab.id));
              }
            }
          }}
          role="tab"
          ref={btnRef}
          tabIndex={0}
          onClick={handleTabClick}
          className={buttonClasses}
          aria-selected={isActiveTab}
          aria-label={`Tab: ${tab.title}`}
          onPointerDown={handlePointerDown}
          onContextMenu={handleContextMenu}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}>
          <div className="flex gap-x-1.5 flex-row items-center min-w-0 flex-1 overflow-hidden">
            <TabIcon tab={tab} currentView={runningCard?.currentView} />

            {runningCard && <AudioIndicator tabId={tab.id} id={runningCard.id} />}

            {!isCompact && <TabTitle title={tab.title} setIsTruncated={setIsTruncated} />}
          </div>

          {!tab.isPinned && (
            <div
              onClick={stopPropagation}
              onKeyUp={stopPropagation}
              onMouseUp={stopPropagation}
              onKeyDown={stopPropagation}
              onMouseDown={stopPropagation}
              onPointerUp={stopPropagation}
              className={closeWrapperClasses}
              onPointerDown={stopPropagation}
              data-tab-close>
              <CloseButton
                className={
                  'scale-85 bg-transparent hover:bg-surface-tertiary ' +
                  (isCloseVisible ? 'pointer-events-auto' : 'pointer-events-none')
                }
                ref={closeBtnRef}
                aria-label="Close tab"
                onClick={stopPropagation}
                onKeyUp={stopPropagation}
                onMouseUp={stopPropagation}
                onKeyDown={stopPropagation}
                onMouseDown={stopPropagation}
                onPointerUp={stopPropagation}
                onPointerDown={stopPropagation}
                onPress={() => handleRemove(false)}
              />
            </div>
          )}

          <ProgressBar progress={tab.progress} />

          {/* Seamless Inactive Tab Divider */}
          <div className={dividerClasses} />
        </div>
      </Tooltip.Trigger>

      <Tooltip.Content placement="bottom" className="max-w-xs text-xs font-normal" showArrow>
        <Tooltip.Arrow />
        <p className="truncate font-medium">{tab.title}</p>
      </Tooltip.Content>
    </Tooltip>
  );
});

export default TabItem;
