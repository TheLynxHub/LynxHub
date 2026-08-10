import {Button} from '@heroui/react';
import {isLinuxPortable} from '@lynx/utils/hooks';
import {Power_Icon} from '@lynx_assets/icons';
import applicationIpc from '@lynx_shared/ipc/application';
import {Forward2Icon, RestartIcon} from '@solar-icons/react/bold-duotone';
import {memo} from 'react';

import {hideContextWindow, useFocus} from '../Shared';
import ConfirmElement from './ConfirmElement';

/**
 * Component for the "Close App" confirmation dialog.
 * Allows the user to exit, restart (if not portable), or cancel.
 */
const CloseApp = memo(() => {
  const onRestart = () => applicationIpc.send.changeWinState('restart');
  const onClose = () => applicationIpc.send.changeWinState('close');

  const focusRef = useFocus();

  return (
    <ConfirmElement
      buttons={
        <>
          <Button size="sm" className="w-22" variant="secondary" onPress={hideContextWindow}>
            <Forward2Icon className="rotate-180 shrink-0 size-3.5" />
            Stay
          </Button>
          <div className="space-x-2">
            {!isLinuxPortable && (
              <Button size="sm" className="w-25" onPress={onRestart} variant="danger-soft">
                <RestartIcon className="shrink-0 size-3.5" />
                Restart
              </Button>
            )}
            <Button size="sm" ref={focusRef} className="w-27" variant="danger" autoFocus={true} onPress={onClose}>
              <Power_Icon className="shrink-0 size-3.5" />
              Exit
            </Button>
          </div>
        </>
      }
      title="Confirm Exit"
      confirmName="closeConfirm"
      enabledTitle="Always exit without confirmation"
    />
  );
});

export default CloseApp;
