import {Checkbox} from '@heroui/react';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {BroomIcon, HistoryIcon, PinIcon} from '@solar-icons/react/bold-duotone';
import {DoubleAltArrowRightIcon} from '@solar-icons/react/linear';
import {X} from 'lucide-react';
import {memo, useCallback} from 'react';

import {useContextState} from '../redux/reducer';
import Separator from './right_click/Separator';
import {ActionButton, createActionHandler} from './right_click/Utils';

/**
 * Layout for Tab Item Context Menu.
 * Supports context actions for tabs: Pin/Unpin, Show Icon Only, Close, Force Close, Close Others, Close to Right, and Reopen Closed Tab.
 */
const TabContextMenu = memo(function TabContextMenu() {
  const payload = useContextState('tabContextMenu');

  const tabId = payload?.tabId;
  const isPinned = Boolean(payload?.isPinned);
  const isIconOnly = Boolean(payload?.showIconOnly);
  const canCloseOthers = Boolean(payload?.canCloseOthers);
  const canCloseRight = Boolean(payload?.canCloseRight);
  const canReopenClosedTab = Boolean(payload?.canReopenClosedTab);

  const handleTogglePin = createActionHandler(() => {
    if (tabId) {
      contextMenuIpc.send.tabActionPin(tabId);
    }
  });

  const handleToggleShowIconOnly = useCallback(() => {
    contextMenuIpc.send.hideWindow();
    if (tabId) {
      contextMenuIpc.send.tabActionIconOnly(tabId);
    }
  }, [tabId]);

  const handleClose = createActionHandler(() => {
    if (tabId) {
      contextMenuIpc.send.tabActionClose(tabId);
    }
  });

  const handleForceClose = createActionHandler(() => {
    if (tabId) {
      contextMenuIpc.send.tabActionForceClose(tabId);
    }
  });

  const handleCloseOthers = createActionHandler(() => {
    if (tabId) {
      contextMenuIpc.send.tabActionCloseOthers(tabId);
    }
  });

  const handleCloseRight = createActionHandler(() => {
    if (tabId) {
      contextMenuIpc.send.tabActionCloseRight(tabId);
    }
  });

  const handleReopenClosed = createActionHandler(() => {
    contextMenuIpc.send.tabActionReopenClosed();
  });

  return (
    <div className="overflow-hidden px-1.5 flex flex-col gap-y-1 py-2 min-w-[220px]">
      <ActionButton
        onPress={handleTogglePin}
        title={isPinned ? 'Unpin Tab' : 'Pin Tab'}
        icon={<PinIcon className={`size-4 ${isPinned ? 'text-warning' : 'text-accent'}`} />}
      />

      <Checkbox className="w-full" variant="secondary" isSelected={isIconOnly} onChange={handleToggleShowIconOnly}>
        <Checkbox.Content
          className={
            'w-full flex items-center gap-x-2 text-sm text-foreground select-none ' +
            'py-2.5 px-3 rounded-xl cursor-pointer hover:bg-surface-tertiary transition-colors duration-100'
          }>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <span className="pointer-events-none text-nowrap">Show Icon Only</span>
        </Checkbox.Content>
      </Checkbox>

      <Separator />

      <ActionButton
        title="Reopen Closed Tab"
        onPress={handleReopenClosed}
        isDisabled={!canReopenClosedTab}
        icon={<HistoryIcon className="size-4 text-muted" />}
      />

      <Separator />

      <ActionButton title="Close Tab" onPress={handleClose} icon={<X className="size-4 text-muted" />} />

      <ActionButton
        onPress={handleForceClose}
        title="Close (Bypass Confirm)"
        icon={<X className="size-4 text-danger" />}
      />

      <ActionButton
        title="Close Other Tabs"
        onPress={handleCloseOthers}
        isDisabled={!canCloseOthers}
        icon={<BroomIcon className="size-4 text-muted" />}
      />

      <ActionButton
        onPress={handleCloseRight}
        isDisabled={!canCloseRight}
        title="Close Tabs to the Right"
        icon={<DoubleAltArrowRightIcon className="size-4 text-muted" />}
      />
    </div>
  );
});

export default TabContextMenu;
