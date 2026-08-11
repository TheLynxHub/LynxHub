import {Button, ButtonGroup, ModalFooter} from '@heroui/react';
import applicationIpc from '@lynx_shared/ipc/application';
import filesIpc from '@lynx_shared/ipc/files';
import ptyIpc from '@lynx_shared/ipc/pty';
import {ArrowRightIcon, DownloadIcon, FolderOpenIcon, RestartIcon} from '@solar-icons/react/bold-duotone';
import {CheckReadIcon} from '@solar-icons/react/line-duotone';
import {X} from 'lucide-react';
import {memo, RefObject, useCallback} from 'react';

import {XTermAPI} from '../../../../useXTerm';
import {useCardStore} from '../../../store';
import LocateWarning from './LocateWarning';
import InstallStepper from './Stepper';
import {selectCanContinue, useInstallStore} from './store';
import FooterTerminal from './TerminalStepFooter';

export interface InstallFooterProps {
  handleClose: () => void;
  stepper: InstallStepper;
  xtermRef: RefObject<XTermAPI | null>;
}

/**
 * Renders the dynamic footer container for the InstallModal connected to `useInstallStore`.
 */
const InstallFooter = memo(({handleClose, stepper, xtermRef}: InstallFooterProps) => {
  const cardId = useCardStore(st => st.id);

  const body = useInstallStore(s => s.body);
  const doneAll = useInstallStore(s => s.doneAll);
  const startClone = useInstallStore(s => s.startClone);
  const disableSelectDir = useInstallStore(s => s.disableSelectDir);
  const progressInfo = useInstallStore(s => s.progressInfo);
  const urlToDownload = useInstallStore(s => s.urlToDownload);
  const locateWarnIsOpen = useInstallStore(s => s.locateWarnIsOpen);
  const canContinue = useInstallStore(selectCanContinue);

  const resolveStarter = useInstallStore(s => s.resolveStarter);
  const resolveUserInput = useInstallStore(s => s.resolveUserInput);
  const resolveTerminal = useInstallStore(s => s.resolveTerminal);
  const updateState = useInstallStore(s => s.updateState);
  const setLocateWarnIsOpen = useInstallStore(s => s.setLocateWarnIsOpen);
  const triggerRestartTerminal = useInstallStore(s => s.triggerRestartTerminal);

  const onDoneTerminal = useCallback(() => {
    ptyIpc.stop(cardId);
    resolveTerminal();
  }, [cardId, resolveTerminal]);

  const locate = useCallback(() => {
    filesIpc.openDlg({properties: ['openDirectory']}).then(targetDirectory => {
      if (targetDirectory) {
        applicationIpc.invoke.isValidDataPath(targetDirectory).then(isAppDir => {
          if (isAppDir) {
            setLocateWarnIsOpen(true);
          } else {
            resolveStarter({chosen: 'locate', targetDirectory});
          }
        });
      }
    });
  }, [resolveStarter, setLocateWarnIsOpen]);

  const nextStep = useCallback(() => {
    void stepper.nextStep();
  }, [stepper]);

  const downloadFileFromUrl = useCallback(
    (url: string) => {
      void stepper.downloadFileFromUrl(url);
    },
    [stepper],
  );

  const renderFooterButtons = () => {
    const isSuccess = doneAll.type === 'success';
    const isDone = body === 'done';

    return (
      <>
        <Button
          className="flex-1"
          onPress={handleClose}
          variant={!isDone ? 'danger-soft' : isSuccess ? 'primary' : 'secondary'}>
          {isDone && isSuccess ? <CheckReadIcon className="size-5" /> : <X className="size-3.5" />}
          {!isDone ? 'Cancel' : isSuccess ? 'Finish' : 'Close'}
        </Button>

        {body === 'terminal' && (
          <FooterTerminal
            cardID={cardId}
            xtermRef={xtermRef}
            onDoneTerminal={onDoneTerminal}
            restartTerminal={{current: triggerRestartTerminal}}
          />
        )}

        {body === 'starter' && (
          <>
            {!disableSelectDir && (
              <Button onPress={locate} className="flex-1" variant="secondary">
                <FolderOpenIcon />
                Locate
              </Button>
            )}
            <Button className="flex-1" onPress={() => resolveStarter({chosen: 'install'})}>
              Start Installation
              <ArrowRightIcon className="size-4" />
            </Button>
          </>
        )}

        {body === 'clone' && !startClone && (
          <Button className="flex-1" onPress={() => updateState({startClone: true})}>
            <DownloadIcon className="size-4" />
            Download
          </Button>
        )}

        {body === 'user-input' && (
          <Button className="flex-1" isDisabled={!canContinue} onPress={resolveUserInput}>
            Next
            <ArrowRightIcon className="size-4" />
          </Button>
        )}

        {body === 'extension-custom' && (
          <Button className="flex-1" onPress={nextStep}>
            Next
            <ArrowRightIcon className="size-4" />
          </Button>
        )}

        {progressInfo?.stage === 'failed' && urlToDownload && (
          <Button className="flex-1" variant="secondary" onPress={() => downloadFileFromUrl(urlToDownload)}>
            <RestartIcon className="size-4" />
            Try Again
          </Button>
        )}
      </>
    );
  };

  return (
    <ModalFooter>
      <LocateWarning isOpen={locateWarnIsOpen} setIsOpen={setLocateWarnIsOpen} />
      <ButtonGroup fullWidth>{renderFooterButtons()}</ButtonGroup>
    </ModalFooter>
  );
});

export default InstallFooter;
