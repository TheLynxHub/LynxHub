import {Card, Label, Link, ProgressBar, Skeleton, useOverlayState} from '@heroui/react';
import {GitHub_Icon} from '@lynx_assets/icons';
import {GitProgressCallback} from '@lynx_common/types/ipc';
import {extractGitUrl, isWin} from '@lynx_common/utils';
import filesIpc from '@lynx_shared/ipc/files';
import gitIpc from '@lynx_shared/ipc/git';
import {Folder2Icon} from '@solar-icons/react/bold-duotone';
import {capitalize} from 'lodash-es';
import {memo, useEffect, useRef, useState} from 'react';
import {SimpleGitProgressEvent} from 'simple-git';

import {initGitProgress} from '../../../../../../../utils/constants';
import DescriptionGrid, {DescriptionGridItem} from '../../../../../../DescriptionGrid';
import OpenDialog from '../../../../../../OpenDialog';
import StepAlerts from '../../components/StepAlerts';
import {useInstallStore} from '../../store';
import CloneOptions, {CloneOptionsResult} from './CloneOptions';
import CloneWarningModal from './CloneWarningModal';

export interface CloneRepoViewProps {
  /** Used to detect if the prompt is open to skip duplicate IPC dispatches. */
  isOpen: boolean;
}

/**
 * Orchestrates Git cloning interactions, utilizing the OS filesystem picker for path selection
 * and rendering a progress visualization.
 */
function CloneRepoView({isOpen}: CloneRepoViewProps) {
  const url = useInstallStore(s => s.cloneUrl);
  const start = useInstallStore(s => s.startClone);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);
  const resolveClone = useInstallStore(s => s.resolveClone);
  const updateState = useInstallStore(s => s.updateState);
  const setCloneDirValid = useInstallStore(s => s.setCloneDirValid);

  const warningModal = useOverlayState();

  const [cloneOptionsResult, setCloneOptionsResult] = useState<CloneOptionsResult>({
    depth: 1,
    branch: '',
    singleBranch: true,
  });

  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<SimpleGitProgressEvent>(initGitProgress);
  const [directory, setDirectory] = useState<string>('');

  const isCloningRef = useRef<boolean>(false);

  const isProgressReady = Boolean(
    downloadProgress.stage &&
    downloadProgress.stage.toLowerCase() !== 'unknown' &&
    (downloadProgress.total > 0 || downloadProgress.processed > 0),
  );

  const progressItems: DescriptionGridItem[] = [
    {
      key: 'stage',
      label: 'Stage',
      content: isProgressReady ? capitalize(downloadProgress.stage) : <Skeleton className="h-5 w-24 rounded-lg" />,
    },
    {
      key: 'item',
      label: 'Item',
      content: isProgressReady ? downloadProgress.processed : <Skeleton className="h-5 w-16 rounded-lg" />,
    },
    {
      key: 'total',
      label: 'Total',
      content:
        isProgressReady && downloadProgress.total > 0 ? (
          downloadProgress.total
        ) : (
          <Skeleton className="h-5 w-16 rounded-lg" />
        ),
    },
  ];

  useEffect(() => {
    filesIpc.getAppDirectories('AIWorkspaces').then(dir => {
      const targetDirectory = `${dir}${isWin ? '\\' : '/'}${extractGitUrl(url).repo}`;
      setDirectory(targetDirectory);
    });
  }, [url]);

  useEffect(() => {
    if (!start) {
      isCloningRef.current = false;
      return () => {};
    }

    const onProgress: GitProgressCallback = (id, state, result) => {
      if (id || !isOpen) return;

      switch (state) {
        case 'Progress':
          setDownloadProgress(result as SimpleGitProgressEvent);
          break;
        case 'Failed':
          isCloningRef.current = false;
          warningModal.open();
          setDownloading(false);
          updateState({startClone: false});
          break;
        case 'Completed':
          isCloningRef.current = false;
          setDownloading(false);
          resolveClone(directory);
          break;
      }
    };

    const removeListener = gitIpc.onProgress(onProgress);

    if (!isCloningRef.current) {
      isCloningRef.current = true;
      setDownloading(true);

      const {singleBranch, branch, depth} = cloneOptionsResult;
      gitIpc.cloneShallow({url, directory, singleBranch, depth, branch});
    }

    return () => {
      removeListener();
    };
  }, [start, cloneOptionsResult, url, directory, isOpen, resolveClone, updateState, warningModal]);

  return (
    <>
      {downloading ? (
        <>
          <ProgressBar
            size="lg"
            isIndeterminate={!isProgressReady}
            value={isProgressReady ? downloadProgress.progress : undefined}>
            <Label>{isProgressReady ? `${Math.round(downloadProgress.progress)}%` : 'Cloning repository...'}</Label>
            <ProgressBar.Output />
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>

          <DescriptionGrid
            columns={2}
            items={progressItems}
            itemClassName="bg-surface"
            className="mt-6 bg-surface-secondary"
          />
        </>
      ) : (
        <div className="mt-4 flex flex-col gap-y-4">
          <Card variant="secondary">
            <Card.Header className="flex flex-row items-center gap-x-2 text-surface-secondary-foreground">
              <GitHub_Icon />
              <span>Clone Url</span>
            </Card.Header>
            <Card.Content>
              <Link onPress={() => window.open(url)}>
                {url}
                <Link.Icon />
              </Link>
            </Card.Content>
          </Card>
          <Card variant="secondary">
            <Card.Header className="flex flex-row items-center gap-x-2 text-surface-secondary-foreground">
              <Folder2Icon />
              <span>Save to</span>
            </Card.Header>
            <Card.Content>
              <OpenDialog
                directory={directory}
                setDirectory={setDirectory}
                onValidityChange={setCloneDirValid}
                extraFolder={extractGitUrl(url).repo}
                dialogType={{properties: ['openDirectory']}}
              />
            </Card.Content>
          </Card>
          <CloneOptions url={url} setCloneOptionsResult={setCloneOptionsResult} />
          <StepAlerts currentStep={currentStep} />
        </div>
      )}

      <CloneWarningModal state={warningModal} />
    </>
  );
}

export default memo(CloneRepoView);
