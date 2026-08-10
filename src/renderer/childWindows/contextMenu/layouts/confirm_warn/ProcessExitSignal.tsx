import {Button, Chip} from '@heroui/react';
import {terminalLineEnding} from '@lynx_common/utils';
import ptyIpc from '@lynx_shared/ipc/pty';
import {ExitIcon, Forward2Icon} from '@solar-icons/react/bold-duotone';

import {useContextState} from '../../redux/reducer';
import {hideContextWindow, useFocus} from '../Shared';
import ConfirmElement from './ConfirmElement';

export default function ProcessExitSignal() {
  const id = useContextState('targetID');
  const focusRef = useFocus();

  const exit = () => {
    ptyIpc.write(id, '\x03');
    hideContextWindow();
  };

  const exitWithY = () => {
    ptyIpc.write(id, '\x03');
    ptyIpc.write(id, 'y' + terminalLineEnding);
    hideContextWindow();
  };

  return (
    <>
      <ConfirmElement
        buttons={
          <>
            <Button size="sm" className="w-20" variant="secondary" onPress={hideContextWindow}>
              <Forward2Icon className="rotate-180 shrink-0 size-3.5" />
              Cancel
            </Button>
            <div className="space-x-2">
              <Button size="sm" onPress={exit} className="w-25" variant="danger-soft">
                <ExitIcon className="shrink-0 size-3.5" />
                Exit
              </Button>
              <Button size="sm" ref={focusRef} variant="danger" className="w-25" onPress={exitWithY}>
                <ExitIcon className="shrink-0 size-3.5" />
                Exit
                <Chip size="sm" className="bg-surface/30 shrink-0">
                  Y
                </Chip>
              </Button>
            </div>
          </>
        }
        confirmName="exitSignalConfirm"
        title="Confirm Sending Exit Signal"
        enabledTitle="Always send without confirmation"
      />
    </>
  );
}
