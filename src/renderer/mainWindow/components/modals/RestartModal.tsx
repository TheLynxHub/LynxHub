import {Button, Modal} from '@heroui/react';
import {Power_Icon} from '@lynx_assets/icons';
import applicationIpc from '@lynx_shared/ipc/application';
import {Forward2Icon, RestartIcon, ShieldWarningIcon} from '@solar-icons/react/bold-duotone';
import {useDispatch} from 'react-redux';

import {modalActions, useModalsState} from '../../redux/reducers/modals';
import {AppDispatch} from '../../redux/store';
import {isLinuxPortable} from '../../utils/hooks';
import TabModal from '../TabModal';

/**
 * Modal that prompts the user to restart the application or exit.
 * Used when a configuration change requires a restart to take effect.
 */
export function RestartModal() {
  const dispatch = useDispatch<AppDispatch>();
  const {isOpen, message} = useModalsState('restartModal');

  const handleClose = () => {
    dispatch(modalActions.closeRestartModal());
  };

  const handleRestart = () => {
    handleClose();
    applicationIpc.send.changeWinState('restart');
  };

  const handleExit = () => {
    handleClose();
    applicationIpc.send.changeWinState('close');
  };

  return (
    <TabModal size="md" isOpen={isOpen} onOpenChange={handleClose}>
      <Modal.Header>
        <Modal.Heading className="flex items-center gap-x-1">
          <ShieldWarningIcon className="text-warning size-6" />
          <span>Restart Required</span>
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onPress={handleClose}>
          <Forward2Icon className="rotate-180 size-4" />
          Restart Later
        </Button>
        <Button onPress={isLinuxPortable ? handleExit : handleRestart}>
          {isLinuxPortable ? <Power_Icon className="size-3.5" /> : <RestartIcon className="size-4" />}
          {isLinuxPortable ? 'Exit Now' : 'Restart Now'}
        </Button>
      </Modal.Footer>
    </TabModal>
  );
}
