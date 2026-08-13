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

/**
 * Renders the center content of the installation modal conditionally according to `useInstallStore`.
 */
const InstallBody = memo(({isOpen, xtermRef}: InstallBodyProps) => {
  const cardId = useCardStore(st => st.id);
  const title = useCardStore(st => st.title);

  const bodyState = useInstallStore(s => s.body);
  const cloneUrl = useInstallStore(s => s.cloneUrl);
  const startClone = useInstallStore(s => s.startClone);
  const terminalKey = useInstallStore(s => s.terminalKey);
  const doneAll = useInstallStore(s => s.doneAll);
  const extensionUserInput = useInstallStore(s => s.extensionUserInput);
  const ExtensionCustomContent = useInstallStore(s => s.extensionCustomContent);
  const progressInfo = useInstallStore(s => s.progressInfo);
  const userInputElements = useInstallStore(s => s.userInputElements);
  const extensionsToInstall = useInstallStore(s => s.extensionsToInstall);
  const progressBarState = useInstallStore(s => s.progressBarState);
  const steps = useInstallStore(s => s.steps);
  const currentStepIndex = useInstallStore(s => s.currentStep);

  const resolveClone = useInstallStore(s => s.resolveClone);
  const resolveExtensions = useInstallStore(s => s.resolveExtensions);
  const updateState = useInstallStore(s => s.updateState);

  const currentStep = steps[currentStepIndex];

  const doneClone = useCallback(
    (dir: string) => {
      resolveClone(dir);
    },
    [resolveClone],
  );

  const renderBody = () => {
    const progressBarItems: DescriptionGridItem[] = (progressBarState.description ?? []).map((desc, index) => ({
      key: `${desc.label}_${index}`,
      label: desc.label,
      content: desc.value,
    }));

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

    switch (bodyState) {
      case 'clone':
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
      case 'terminal':
        return (
          <div className="size-full flex flex-col gap-y-2">
            <TerminalStep id={cardId} key={terminalKey} xtermRef={xtermRef} />
            {renderAlerts(currentStep)}
          </div>
        );
      case 'progress-bar':
        return (
          <div className="mb-8 mt-4 text-center flex flex-col">
            {progressBarState.title && <span className="text-large font-semibold">{progressBarState.title}</span>}
            <ProgressBar
              size="lg"
              value={progressBarState.percentage}
              isIndeterminate={progressBarState.isIndeterminate}>
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
      case 'progress':
        return progressInfo?.stage === 'failed' ? (
          <EmptyStateCard
            className="my-6"
            title="Download Failed"
            icon={<ShieldCrossIcon className="size-12 text-danger" />}
            description="Please check your internet connection and try again."
          />
        ) : (
          <div className="my-6">
            <ProgressBar size="lg" value={(progressInfo?.percentage || 0) * 100}>
              <Label>{progressBarState.percentage}</Label>
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
      case 'done':
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
      case 'starter':
        return (
          <div className="my-6 space-y-6 text-center">
            <p className="text-xl font-semibold">
              {"You're"} about to install <span className="font-bold">{capitalize(title)}</span>
            </p>
            {renderAlerts(currentStep)}
            <p>Choose an option below to proceed with the installation or locate a pre-existing installation.</p>
          </div>
        );
      case 'user-input':
        return <UserInputs inputElements={userInputElements} extensionElements={extensionUserInput} />;
      case 'install-extensions':
        return (
          <InstallExtensions extensionsURLs={extensionsToInstall} extensionsResolver={{current: resolveExtensions}} />
        );
      case 'extension-custom':
        return ExtensionCustomContent ? <ExtensionCustomContent /> : null;
    }
    return <Fragment />;
  };

  return <ModalBody className="scrollbar-hide">{renderBody()}</ModalBody>;
});

export default InstallBody;
