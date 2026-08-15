import {Label, ModalBody, ProgressBar} from '@heroui/react';
import {formatSize} from '@lynx_common/utils';
import {CheckCircleIcon, SadCircleIcon, ShieldCrossIcon} from '@solar-icons/react/bold-duotone';
import {capitalize} from 'lodash-es';
import {Fragment, memo, RefObject, useCallback} from 'react';

import DescriptionGrid, {DescriptionGridItem} from '../../../../DescriptionGrid';
import EmptyStateCard from '../../../../EmptyStateCard';
import {XTermAPI} from '../../../../useXTerm';
import {useCardStore} from '../../../store';
import CloneRepo from './CloneRepo';
import {renderAlerts} from './CustomAlert';
import InstallExtensions from './Extensions';
import {useInstallStore} from './store';
import TerminalStep from './TerminalStep';
import UserInputs from './UserInputs';

export interface InstallBodyProps {
  isOpen: boolean;
  xtermRef: RefObject<XTermAPI | null>;
}

const DownloadProgressView = memo(() => {
  const progressInfo = useInstallStore(s => s.progressInfo);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);

  const downloadItems: DescriptionGridItem[] = [
    {
      key: 'fileName',
      label: 'File Name',
      content: progressInfo?.fileName ? capitalize(progressInfo.fileName) : 'Unknown',
    },
    {
      key: 'downloaded',
      label: 'Downloaded So Far',
      content: progressInfo?.downloaded ? formatSize(progressInfo.downloaded) : 'Calculating...',
    },
    {
      key: 'total',
      label: 'Total File Size',
      content: progressInfo?.total ? formatSize(progressInfo.total) : 'Calculating...',
    },
  ];

  if (progressInfo?.stage === 'failed') {
    return (
      <EmptyStateCard
        className="my-6"
        title="Download Failed"
        icon={<ShieldCrossIcon className="size-12 text-danger" />}
        description="Please check your internet connection and try again."
      />
    );
  }

  return (
    <div className="my-6">
      <ProgressBar size="lg" value={(progressInfo?.percentage || 0) * 100}>
        <Label>
          {progressInfo?.percentage !== undefined ? `${Math.round(progressInfo.percentage * 100)}%` : undefined}
        </Label>
        <ProgressBar.Output />
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
      <DescriptionGrid
        columns={2}
        items={downloadItems}
        itemClassName="bg-surface"
        className="mt-6 bg-surface-secondary"
      />
      <div className="flex flex-col py-2 gap-y-2">{renderAlerts(currentStep)}</div>
    </div>
  );
});

const CustomProgressBarView = memo(() => {
  const progressBarState = useInstallStore(s => s.progressBarState);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);

  const progressBarItems: DescriptionGridItem[] = (progressBarState.description ?? []).map((desc, index) => ({
    key: `${desc.label}_${index}`,
    label: desc.label,
    content: desc.value,
  }));

  return (
    <div className="mb-8 mt-4 text-center flex flex-col">
      {progressBarState.title && <span className="text-large font-semibold">{progressBarState.title}</span>}
      <ProgressBar size="lg" value={progressBarState.percentage} isIndeterminate={progressBarState.isIndeterminate}>
        <Label>{progressBarState.percentage}</Label>
        <ProgressBar.Output />
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>

      {progressBarItems.length > 0 && (
        <DescriptionGrid
          columns={2}
          items={progressBarItems}
          itemClassName="bg-surface"
          className="mt-8 text-start bg-surface-secondary"
        />
      )}

      <div className="flex flex-col py-2 gap-y-2">{renderAlerts(currentStep)}</div>
    </div>
  );
});

const CloneRepoView = memo(({isOpen}: {isOpen: boolean}) => {
  const cloneUrl = useInstallStore(s => s.cloneUrl);
  const startClone = useInstallStore(s => s.startClone);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);
  const resolveClone = useInstallStore(s => s.resolveClone);
  const updateState = useInstallStore(s => s.updateState);

  const doneClone = useCallback(
    (dir: string) => {
      resolveClone(dir);
    },
    [resolveClone],
  );

  return (
    <CloneRepo
      url={cloneUrl}
      isOpen={isOpen}
      done={doneClone}
      start={startClone}
      currentStep={currentStep}
      updateState={updateState}
    />
  );
});

const TerminalView = memo(({xtermRef}: {xtermRef: RefObject<XTermAPI | null>}) => {
  const cardId = useCardStore(st => st.id);
  const terminalKey = useInstallStore(s => s.terminalKey);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);

  return (
    <div className="size-full flex flex-col gap-y-2">
      <TerminalStep id={cardId} key={terminalKey} xtermRef={xtermRef} />
      {renderAlerts(currentStep)}
    </div>
  );
});

const DoneView = memo(() => {
  const doneAll = useInstallStore(s => s.doneAll);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);

  return (
    <div className="size-full flex flex-col gap-y-2">
      <EmptyStateCard
        icon={
          doneAll.type === 'success' ? (
            <CheckCircleIcon className="shrink-0 size-14 text-success" />
          ) : (
            <SadCircleIcon className="shrink-0 size-14 text-danger" />
          )
        }
        className="my-6"
        title={doneAll.title}
        description={doneAll.description}
      />

      {renderAlerts(currentStep)}
    </div>
  );
});

const StarterView = memo(() => {
  const title = useCardStore(st => st.title);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);

  return (
    <div className="my-6 space-y-6 text-center">
      <p className="text-xl font-semibold">
        {"You're"} about to install <span className="font-bold">{capitalize(title)}</span>
      </p>
      {renderAlerts(currentStep)}
      <p>Choose an option below to proceed with the installation or locate a pre-existing installation.</p>
    </div>
  );
});

const UserInputView = memo(() => {
  const userInputElements = useInstallStore(s => s.userInputElements);
  const extensionUserInput = useInstallStore(s => s.extensionUserInput);

  return <UserInputs inputElements={userInputElements} extensionElements={extensionUserInput} />;
});

const InstallExtensionsView = memo(() => {
  const extensionsToInstall = useInstallStore(s => s.extensionsToInstall);

  return <InstallExtensions extensionsURLs={extensionsToInstall} />;
});

const ExtensionCustomView = memo(() => {
  const ExtensionCustomContent = useInstallStore(s => s.extensionCustomContent);

  return ExtensionCustomContent ? <ExtensionCustomContent /> : null;
});

/**
 * Renders the center content of the installation modal conditionally according to `useInstallStore`.
 */
const InstallBody = memo(({isOpen, xtermRef}: InstallBodyProps) => {
  const bodyState = useInstallStore(s => s.body);

  const renderBody = () => {
    switch (bodyState) {
      case 'clone':
        return <CloneRepoView isOpen={isOpen} />;
      case 'terminal':
        return <TerminalView xtermRef={xtermRef} />;
      case 'progress-bar':
        return <CustomProgressBarView />;
      case 'progress':
        return <DownloadProgressView />;
      case 'done':
        return <DoneView />;
      case 'starter':
        return <StarterView />;
      case 'user-input':
        return <UserInputView />;
      case 'install-extensions':
        return <InstallExtensionsView />;
      case 'extension-custom':
        return <ExtensionCustomView />;
      default:
        return <Fragment />;
    }
  };

  return <ModalBody className="scrollbar-hide">{renderBody()}</ModalBody>;
});

export default InstallBody;
