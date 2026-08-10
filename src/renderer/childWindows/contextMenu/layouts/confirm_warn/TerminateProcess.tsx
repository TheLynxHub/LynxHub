import {Button} from '@heroui/react';
import {Power_Icon} from '@lynx_assets/icons';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {Forward2Icon, RestartIcon} from '@solar-icons/react/bold-duotone';
import {memo} from 'react';

import {useContextState} from '../../redux/reducer';
import {hideContextWindow} from '../Shared';
import ConfirmElement from './ConfirmElement';

/**
 * Component for the "Terminate Process" confirmation dialog.
 * Used when stopping or relaunching an AI process/card.
 */
const TerminateProcess = memo(() => {
  const id = useContextState('targetID');

  const onStop = () => {
    contextMenuIpc.send.stopAI(id);
    hideContextWindow();
  };
  const onRelaunch = () => {
    contextMenuIpc.send.relaunchAI(id);
    hideContextWindow();
  };

  return (
    <ConfirmElement
      buttons={
        <>
          <Button size="sm" className="w-22" variant="secondary" onPress={hideContextWindow}>
            <Forward2Icon className="rotate-180 shrink-0 size-3.5" />
            Cancel
          </Button>
          <div className="space-x-2">
            <Button size="sm" className="w-25" onPress={onRelaunch} variant="danger-soft">
              <RestartIcon className="shrink-0 size-3.5" />
              Relaunch
            </Button>
            <Button size="sm" variant="danger" className="w-27" onPress={onStop} autoFocus>
              <Power_Icon className="shrink-0 size-3.5" />
              Terminate
            </Button>
          </div>
        </>
      }
      confirmName="terminateAIConfirm"
      title="Confirm Terminate Process"
      enabledTitle="Always terminate without confirmation"
    />
  );
});

export default TerminateProcess;
