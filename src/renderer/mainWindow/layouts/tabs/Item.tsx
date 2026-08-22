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
  const btnRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [isTruncated, setIsTruncated] = useState<boolean>(false);

  const [isHovered, setIsHovered] = useState<boolean>(false);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const closeTabConfirm = useSettingsState('closeTabConfirm');

  const removeTab = useRemoveTab();

  const isCompact = Boolean(tab.isPinned || tab.showIconOnly);
  const tabIndex = useMemo(() => tabs.findIndex(t => t.id === tab.id), [tabs, tab.id]);
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

  return (
    <Tooltip delay={300} isDisabled={!isTruncated && !isCompact}>
      <Tooltip.Content placement="bottom" showArrow>
        <Tooltip.Arrow />
        <p>{tab.title}</p>
      </Tooltip.Content>

      <Button
        className={
          'text-sm flex flex-row relative ' +
          (tab.isPinned ? 'px-2.5 ' : isCompact ? 'pl-2 pr-1 ' : 'pl-2 pr-1 ') +
          `cursor-default gap-x-0.5 h-9 overflow-hidden rounded-none rounded-t-xl! ` +
          `${isActiveTab ? 'bg-white dark:bg-[#303033]' : 'hover:bg-surface-secondary'} transition duration-200`
        }
        variant="ghost"
        onPress={onPress}
        ref={btnRef as any}
        aria-selected={isActiveTab}
        onHoverChange={setIsHovered}
        aria-label={`Tab: ${tab.title}`}
        onContextMenu={handleContextMenu}
        render={({ref: buttonRef, ...props}) => <div ref={buttonRef as any} {...(props as any)} />}>
        <div className="flex gap-x-0.5 flex-row items-center min-w-0 flex-1">
          <TabIcon tab={tab} currentView={runningCard?.currentView} />

          {runningCard && <AudioIndicator tabId={tab.id} id={runningCard.id} />}

          {!isCompact && <TabTitle title={tab.title} setIsTruncated={setIsTruncated} />}
        </div>

        {!tab.isPinned && (
          <CloseButton
            className={
              `scale-85 bg-transparent hover:bg-surface-tertiary ` +
              `${isActiveTab || isHovered ? 'opacity-100' : 'opacity-0'}`
            }
            ref={closeBtnRef}
            aria-label="Close tab"
            onPress={() => handleRemove(false)}
          />
        )}

        <ProgressBar progress={tab.progress} />
      </Button>
    </Tooltip>
  );
});

export default TabItem;
