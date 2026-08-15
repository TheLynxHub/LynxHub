import {ModalBody} from '@heroui/react';
import {memo, RefObject} from 'react';

import {XTermAPI} from '../../../../../useXTerm';
import {useInstallStore} from '../store';
import CloneRepoView from '../views/CloneRepoView';
import DoneView from '../views/DoneView';
import DownloadProgressView from '../views/DownloadProgressView';
import ExtensionCustomView from '../views/ExtensionCustomView';
import ExtensionsView from '../views/ExtensionsView';
import ProgressBarView from '../views/ProgressBarView';
import StarterView from '../views/StarterView';
import TerminalView from '../views/TerminalView';
import UserInputsView from '../views/UserInputsView';

export interface InstallBodyProps {
  isOpen: boolean;
  xtermRef: RefObject<XTermAPI | null>;
}

/**
 * Main modal body container that routes between active installation views based on store state.
 */
function InstallBody({isOpen, xtermRef}: InstallBodyProps) {
  const bodyState = useInstallStore(s => s.body);

  const renderContent = () => {
    switch (bodyState) {
      case 'starter':
        return <StarterView />;
      case 'clone':
        return <CloneRepoView isOpen={isOpen} />;
      case 'terminal':
        return <TerminalView xtermRef={xtermRef} />;
      case 'progress':
        return <DownloadProgressView />;
      case 'progress-bar':
        return <ProgressBarView />;
      case 'user-input':
        return <UserInputsView />;
      case 'install-extensions':
        return <ExtensionsView />;
      case 'extension-custom':
        return <ExtensionCustomView />;
      case 'done':
        return <DoneView />;
      default:
        return null;
    }
  };

  return (
    <ModalBody
      className={`scrollbar-hide ${
        bodyState === 'terminal' ? 'flex h-full min-h-0 flex-1 flex-col overflow-hidden' : ''
      }`}>
      {renderContent()}
    </ModalBody>
  );
}

export default memo(InstallBody);
