import {Label, ModalBody, ProgressBar} from '@heroui/react';
import {DownloadProgress} from '@lynx_common/types/ipc';
import {InitialStep, UserInputField, UserInputResult} from '@lynx_common/types/plugins/modules';
import {formatSize} from '@lynx_common/utils';
import {CheckCircleIcon, SadCircleIcon, ShieldCrossIcon} from '@solar-icons/react/bold-duotone';
import {capitalize} from 'lodash-es';
import {Dispatch, Fragment, memo, RefObject, SetStateAction, useCallback} from 'react';

import DescriptionGrid, {DescriptionGridItem} from '../../../../DescriptionGrid';
import EmptyStateCard from '../../../../EmptyStateCard';
import {XTermAPI} from '../../../../useXTerm';
import CloneRepo from './CloneRepo';
import {renderAlerts} from './CustomAlert';
import InstallExtensions from './Extensions';
import TerminalStep from './TerminalStep';
import {InstallState} from './types';
import UserInputs from './UserInputs';

export interface InstallBodyProps {
  /** The global modal state driving which view is currently toggled. */
  state: InstallState;
  /** Formatted title name of the repository or card being installed. */
  title: string;
  /** Tracking information from the OS downloader IPC service. */
  progressInfo?: DownloadProgress;
  /** Custom configurations defining what the user needs to select or type. */
  userInputElements: {elements: UserInputField[]; title?: string};
  /** Mutates internal hook state to record answers for fields parsed in `userInputElements`. */
  setUserElementsReturn: Dispatch<SetStateAction<UserInputResult[]>>;
  /** Ref to a callback acknowledging the repository git clone is finished. */
  cloneResolver: RefObject<((dir: string) => void) | null>;
  /** Settings detailing extensions requiring download. */
  extensionsToInstall: {urls: string[]; dir: string} | undefined;
  /** Ref block triggering the app to bypass the extension stage. */
  extensionsResolver: RefObject<(() => void) | null>;
  /** Object determining how to render the dynamic progress bar UI for custom installation tracks. */
  progressBarState: {
    isIndeterminate: boolean;
    title?: string;
    percentage?: number;
    description?: {label: string; value: string}[];
  };
  /** Utility function to partially mutate the modal state. */
  updateState: (newState: Partial<InstallState> | ((prev: InstallState) => Partial<InstallState>)) => void;
  /** Value indicating if the complete Install Modal parent is visibly toggled. */
  isOpen: boolean;
  /** Identifying hash mapping to this unique installation record. */
  cardId: string;
  xtermRef: RefObject<XTermAPI | null>;

  currentStep: InitialStep;
}

/**
 * Handles toggling and rendering all major center-screen content throughout the entire installation flow.
 * Displays components conditionally by matching against the standard InstallState object.
 *
 * @param {InstallBodyProps} props - The component props.
 */
const InstallBody = memo(
  ({
    state,
    title,
    progressInfo,
    userInputElements,
    updateState,
    setUserElementsReturn,
    cloneResolver,
    extensionsToInstall,
    extensionsResolver,
    progressBarState,
    isOpen,
    cardId,
    xtermRef,
    currentStep,
  }: InstallBodyProps) => {
    const doneClone = useCallback(
      (dir: string) => {
        if (cloneResolver.current) {
          cloneResolver.current(dir);
          cloneResolver.current = null;
        }
      },
      [cloneResolver],
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

      switch (state.body) {
        case 'clone':
          return (
            <CloneRepo
              isOpen={isOpen}
              done={doneClone}
              url={state.cloneUrl}
              start={state.startClone}
              currentStep={currentStep}
              updateState={updateState}
            />
          );
        case 'terminal':
          return (
            <div className="size-full flex flex-col gap-y-2">
              <TerminalStep id={cardId} xtermRef={xtermRef} key={state.terminalKey} />
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
              <ProgressBar size="lg" value={progressInfo?.percentage || 70}>
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
                  state.doneAll.type === 'success' ? (
                    <CheckCircleIcon className="shrink-0 size-14 text-success" />
                  ) : (
                    <SadCircleIcon className="shrink-0 size-14 text-danger" />
                  )
                }
                className="my-6"
                title={state.doneAll.title}
                description={state.doneAll.description}
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
          return (
            <UserInputs
              inputElements={userInputElements}
              setResult={setUserElementsReturn}
              extensionElements={state.extensionUserInput}
            />
          );
        case 'install-extensions':
          return <InstallExtensions extensionsURLs={extensionsToInstall} extensionsResolver={extensionsResolver} />;
        case 'extension-custom':
          return state.extensionCustomContent ? <state.extensionCustomContent /> : null;
      }
      return <Fragment />;
    };

    return <ModalBody className="scrollbar-hide">{renderBody()}</ModalBody>;
  },
);

export default InstallBody;
