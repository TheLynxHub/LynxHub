import {Button, ButtonGroup, ModalFooter} from '@heroui/react';
import {DownloadProgress} from '@lynx_common/types/ipc';
import {InstallationMethod, UserInputResult} from '@lynx_common/types/plugins/modules';
import applicationIpc from '@lynx_shared/ipc/application';
import filesIpc from '@lynx_shared/ipc/files';
import ptyIpc from '@lynx_shared/ipc/pty';
import {ArrowRightIcon, DownloadIcon, FolderOpenIcon, RestartIcon} from '@solar-icons/react/bold-duotone';
import {CheckReadIcon} from '@solar-icons/react/line-duotone';
import {X} from 'lucide-react';
import {memo, RefObject, useCallback, useState} from 'react';

import {XTermAPI} from '../../../../useXTerm';
import LocateWarning from './LocateWarning';
import FooterTerminal from './TerminalStepFooter';
import {InstallState} from './types';

export interface InstallFooterProps {
  /** The current active UI and internal installation state. */
  state: InstallState;
  /** Function to cleanly close the modal and revert states. */
  handleClose: () => void;
  /** Ref hook for restarting the attached terminal session. */
  restartTerminal: RefObject<(() => void) | null>;
  /** Ref resolver for the starting step of installation. */
  starterResolver: RefObject<((result: InstallationMethod) => void) | null>;
  /** Ref resolver for generic terminal operations. */
  terminalResolver: RefObject<(() => void) | null>;
  /** Utility function to partially mutate the modal state. */
  updateState: (newState: Partial<InstallState> | ((prev: InstallState) => Partial<InstallState>)) => void;
  /** Ref resolver triggered when user submits required elements. */
  userInputResolver: RefObject<((result: UserInputResult[]) => void) | null>;
  /** The final inputs returned by standard input field components. */
  userElementsReturn: UserInputResult[];
  /** Helper function to download generic configuration files if required. */
  downloadFileFromUrl: (url: string) => Promise<string>;
  /** The target URL configured for a generic download command. */
  urlToDownload: string | undefined;
  /** Active tracking details for files being downloaded. */
  progressInfo: DownloadProgress | undefined;
  /** Unique card ID driving this installation. */
  cardId: string;
  /** Computed check indicating whether user fields are correctly filled to enable next actions. */
  canContinue: boolean;
  /** Trigger for stepping into the next sequence of an extension-custom UI. */
  nextStep: () => void;
  xtermRef: RefObject<XTermAPI | null>;
}

/**
 * The dynamic footer container for the InstallModal.
 * Displays appropriate user action buttons (Next, Resolve, Cancel, Try Again) conditionally based on the `body` state.
 *
 * @param {InstallFooterProps} props - The component props.
 */
const InstallFooter = memo(
  ({
    state,
    handleClose,
    restartTerminal,
    starterResolver,
    updateState,
    userInputResolver,
    userElementsReturn,
    terminalResolver,
    downloadFileFromUrl,
    urlToDownload,
    progressInfo,
    cardId,
    canContinue,
    nextStep,
    xtermRef,
  }: InstallFooterProps) => {
    const [locateWarnIsOpen, setLocateWarnIsOpen] = useState<boolean>(false);
    const onDoneTerminal = useCallback(() => {
      if (terminalResolver.current) {
        ptyIpc.stop(cardId);
        terminalResolver.current();
        terminalResolver.current = null;
      }
    }, [terminalResolver]);

    const locate = useCallback(() => {
      filesIpc.openDlg({properties: ['openDirectory']}).then(targetDirectory => {
        if (targetDirectory) {
          applicationIpc.invoke.isValidDataPath(targetDirectory).then(isAppDir => {
            if (isAppDir) {
              setLocateWarnIsOpen(true);
            } else {
              starterResolver.current?.({chosen: 'locate', targetDirectory});
            }
          });
        }
      });
    }, [starterResolver]);

    const renderFooterButtons = () => {
      const isSuccess = state.doneAll.type === 'success';
      const isDone = state.body === 'done';

      return (
        <>
          <Button
            className="flex-1"
            onPress={handleClose}
            variant={!isDone ? 'danger-soft' : isSuccess ? 'primary' : 'secondary'}>
            {isDone && isSuccess ? <CheckReadIcon className="size-5" /> : <X className="size-3.5" />}
            {!isDone ? 'Cancel' : isSuccess ? 'Finish' : 'Close'}
          </Button>
          {state.body === 'terminal' && (
            <FooterTerminal
              cardID={cardId}
              xtermRef={xtermRef}
              onDoneTerminal={onDoneTerminal}
              restartTerminal={restartTerminal}
            />
          )}
          {state.body === 'starter' && (
            <>
              {!state.disableSelectDir && (
                <Button onPress={locate} className="flex-1" variant="secondary">
                  <FolderOpenIcon />
                  Locate
                </Button>
              )}
              <Button className="flex-1" onPress={() => starterResolver.current?.({chosen: 'install'})}>
                Start Installation
                <ArrowRightIcon className="size-4" />
              </Button>
            </>
          )}
          {state.body === 'clone' && !state.startClone && (
            <Button className="flex-1" onPress={() => updateState({startClone: true})}>
              <DownloadIcon className="size-4" />
              Download
            </Button>
          )}
          {state.body === 'user-input' && (
            <Button
              onPress={() => {
                userInputResolver.current?.(userElementsReturn);
              }}
              className="flex-1"
              isDisabled={!canContinue}>
              Next
              <ArrowRightIcon className="size-4" />
            </Button>
          )}
          {state.body === 'extension-custom' && (
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
  },
);

export default InstallFooter;
