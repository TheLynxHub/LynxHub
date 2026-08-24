import {Button} from '@heroui/react';
import {useHotkeysState} from '@lynx/redux/reducers/hotkeys';
import {useSettingsState} from '@lynx/redux/reducers/settings';
import {Stop_Icon} from '@lynx_assets/icons';
import {terminalLineEnding} from '@lynx_common/utils/platform';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import ptyIpc from '@lynx_shared/ipc/pty';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {ExitIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback, useRef} from 'react';

import LynxTooltip from '../../../../components/LynxTooltip';
import {useTerminalState} from '../../../../redux/reducers/terminal';

type Props = {
  /**
   * The ID of the process/card to terminate.
   */
  id: string;
};

/**
 * A button to terminate the running AI/process.
 * Checks for confirmation settings and hotkeys.
 */
const TerminateProcessButton = memo(({id}: Props) => {
  const isCtrlPressed = useHotkeysState('isCtrlPressed');
  const showTerminateConfirm = useSettingsState('terminateAIConfirm');
  const exitSignalConfirm = useSettingsState('exitSignalConfirm');
  const sendYWithExit = useTerminalState('sendYWithExit');
  const exitBtnRef = useRef<HTMLButtonElement>(null);
  const stopBtnRef = useRef<HTMLButtonElement>(null);

  const handleStop = useCallback(() => {
    if (!id) return;

    if (isCtrlPressed || !showTerminateConfirm) {
      AddBreadcrumb_Renderer('Running Card: Terminate process (force)');
      contextMenuIpc.send.stopAI(id);
    } else {
      AddBreadcrumb_Renderer('Running Card: Open terminate process dialog');
      const rect = stopBtnRef.current?.getBoundingClientRect();
      const customPosition = rect ? {x: Math.floor(rect.x), y: Math.floor(rect.bottom + 4)} : undefined;
      contextMenuIpc.send.openTerminateProcess(id, customPosition);
    }
  }, [id, isCtrlPressed, showTerminateConfirm]);

  const handleExit = useCallback(() => {
    if (isCtrlPressed || !exitSignalConfirm) {
      AddBreadcrumb_Renderer('Running Card: Send exit signal (force)');
      ptyIpc.write(id, '\x03');
      if (sendYWithExit) ptyIpc.write(id, 'y' + terminalLineEnding);
    } else {
      AddBreadcrumb_Renderer('Running Card: Open send exit signal dialog');
      const rect = exitBtnRef.current?.getBoundingClientRect();
      const customPosition = rect ? {x: Math.floor(rect.x), y: Math.floor(rect.bottom + 4)} : undefined;
      contextMenuIpc.send.openSendExitSignal(id, customPosition);
    }
  }, [id, sendYWithExit, exitSignalConfirm, isCtrlPressed]);

  return (
    <>
      <LynxTooltip delay={500} content="Send exit signal to the process">
        <Button
          size="sm"
          ref={exitBtnRef}
          onPress={handleExit}
          className="text-warning-soft-foreground bg-warning-soft hover:bg-warning-soft-hover"
          isIconOnly>
          <ExitIcon size={16} />
        </Button>
      </LynxTooltip>
      <LynxTooltip delay={500} content="Terminate Process">
        <Button
          size="sm"
          ref={stopBtnRef}
          onPress={handleStop}
          variant="danger-soft"
          aria-label="Terminate Process"
          isIconOnly>
          <Stop_Icon className="size-4" />
        </Button>
      </LynxTooltip>
    </>
  );
});

TerminateProcessButton.displayName = 'TerminateProcessButton';

export default TerminateProcessButton;
