import {Button, CloseButton, Tooltip} from '@heroui/react';
import useHotkeyPress from '@lynx/hooks/hotkeys';
import {useCardsState} from '@lynx/redux/reducers/cards';
import {useHotkeysState} from '@lynx/redux/reducers/hotkeys';
import {useSettingsState} from '@lynx/redux/reducers/settings';
import {tabsActions, useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {Hotkey_Names} from '@lynx_common/consts/hotkeys';
import {TabInfo} from '@lynx_common/types';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
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
};

/**
 * Component representing a single tab in the tab bar.
 * Handles selection, closing, and drag interactions.
 */
const TabItem = memo(({tab, isOrdering}: Props) => {
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
        },
        {x: e.clientX, y: e.clientY},
      );
    },
    [tab.id, tab.title, tab.isPinned, tab.showIconOnly, canCloseOthers, canCloseRight, tabs.length, runningCard],
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

  const onPress = useCallback(() => {
    if (!isOrdering) {
      dispatch(tabsActions.setActiveTab(tab.id));
    }
  }, [dispatch, tab.id, isOrdering]);

  const isTooltipDisabled = isOrdering || (!isTruncated && !isCompact);

  const buttonClasses =
    'text-sm flex flex-row relative w-full h-9 overflow-hidden rounded-none rounded-t-xl! ' +
    'cursor-default select-none transition-colors duration-150 px-2 ' +
    (tab.isPinned ? 'justify-center ' : 'justify-start ') +
    (isActiveTab
      ? 'bg-white dark:bg-[#303033] shadow-xs text-foreground'
      : 'text-foreground/80 hover:text-foreground hover:bg-surface-secondary/70');

  const closeWrapperClasses =
    'absolute right-0 top-0 bottom-0 z-10 flex items-center pr-1 pl-4 transition-opacity duration-150 ' +
    (isActiveTab
      ? 'opacity-100 pointer-events-auto bg-gradient-to-l from-white dark:from-[#303033] ' +
        'via-white/90 dark:via-[#303033]/90 to-transparent'
      : isHovered
        ? 'opacity-100 pointer-events-auto bg-gradient-to-l from-surface-secondary ' +
          'via-surface-secondary/90 to-transparent'
        : 'opacity-0 pointer-events-none');

  const dividerClasses =
    'absolute right-0 top-2.5 bottom-2.5 w-px bg-border-secondary transition-opacity ' +
    'duration-150 pointer-events-none ' +
    (showDivider ? 'opacity-100' : 'opacity-0');

  return (
    <Tooltip delay={350} isDisabled={isTooltipDisabled}>
      <Tooltip.Trigger className="w-full h-full flex items-center outline-none">
        <Button
          variant="ghost"
          onPress={onPress}
          ref={btnRef as any}
          className={buttonClasses}
          aria-selected={isActiveTab}
          onHoverChange={setIsHovered}
          aria-label={`Tab: ${tab.title}`}
          onContextMenu={handleContextMenu}
          render={({ref: buttonRef, ...props}) => <div ref={buttonRef as any} {...(props as any)} />}>
          <div className="flex gap-x-1.5 flex-row items-center min-w-0 flex-1 overflow-hidden">
            <TabIcon tab={tab} currentView={runningCard?.currentView} />

            {runningCard && <AudioIndicator tabId={tab.id} id={runningCard.id} />}

            {!isCompact && <TabTitle title={tab.title} setIsTruncated={setIsTruncated} />}
          </div>

          {!tab.isPinned && (
            <div className={closeWrapperClasses}>
              <CloseButton
                ref={closeBtnRef}
                aria-label="Close tab"
                onPress={() => handleRemove(false)}
                className="scale-85 bg-transparent hover:bg-surface-tertiary"
              />
            </div>
          )}

          <ProgressBar progress={tab.progress} />

          {/* Seamless Inactive Tab Divider */}
          <div className={dividerClasses} />
        </Button>
      </Tooltip.Trigger>

      <Tooltip.Content placement="bottom" className="max-w-xs text-xs font-normal" showArrow>
        <Tooltip.Arrow />
        <p className="truncate font-medium">{tab.title}</p>
      </Tooltip.Content>
    </Tooltip>
  );
});

export default TabItem;
