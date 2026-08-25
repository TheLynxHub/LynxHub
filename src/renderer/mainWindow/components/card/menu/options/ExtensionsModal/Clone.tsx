import {Card, FieldError, InputGroup, Label, ProgressBar, Separator, TextField} from '@heroui/react';
import {GitHub_Icon} from '@lynx_assets/icons';
import {GitProgressCallback} from '@lynx_common/types/ipc';
import {extractGitUrl, validateGitRepoUrl} from '@lynx_common/utils';
import gitIpc from '@lynx_shared/ipc/git';
import {DownloadIcon} from '@solar-icons/react/bold-duotone';
import {motion} from 'framer-motion';
import {capitalize, startCase} from 'lodash-es';
import {useCallback, useEffect, useState} from 'react';
import {SimpleGitProgressEvent} from 'simple-git';

import {topToast} from '../../../../../layouts/ToastProviders';
import {useAppState} from '../../../../../redux/reducers/app';
import {initGitProgress} from '../../../../../utils/constants';
import {tabContentVariants} from './Constants';

type Props = {
  visible: boolean;
  updateTable: () => void;
  installedExtensions: string[];
  dir: string;
};

type ClipData = {name: string; owner: string; url: string};

/** Download (Clone repo) to extension folder of installed card */
export default function Clone({updateTable, visible, installedExtensions, dir}: Props) {
  const isFocused = useAppState('onFocus');

  const [resultUrl, setResultUrl] = useState<string>('');
  const [downloadBox, setDownloadBox] = useState<ClipData | undefined>(undefined);
  const [cloneProgress, setCloneProgress] = useState<SimpleGitProgressEvent>(initGitProgress);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [isEmpty, setIsEmpty] = useState<boolean>(true);
  const [cloning, setCloning] = useState<boolean>(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (downloadBox) {
      setAlreadyInstalled(installedExtensions.includes(validateGitRepoUrl(downloadBox.url)));
    } else {
      setAlreadyInstalled(false);
    }
  }, [downloadBox, installedExtensions]);

  const readClipboard = useCallback(async () => {
    try {
      const clipText = await navigator.clipboard.readText();

      const validUrl = validateGitRepoUrl(clipText.toLowerCase());
      if (validUrl) {
        const {owner, repo} = extractGitUrl(validUrl);
        setDownloadBox({name: repo, owner, url: validUrl});
        setResultUrl(validUrl);
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
    }
  }, []);

  const clone = useCallback(() => {
    if (alreadyInstalled) return;
    setCloning(true);
    gitIpc.cloneShallow({
      url: downloadBox?.url || '',
      directory: `${dir}/${downloadBox?.name || ''}`,
      singleBranch: true,
      depth: 1,
    });
  }, [downloadBox, dir, alreadyInstalled]);

  useEffect(() => {
    if (isFocused) {
      readClipboard();
    }
  }, [isFocused, readClipboard]);

  useEffect(() => {
    setCloning(false);
    setDownloadBox(undefined);
    setIsEmpty(true);
    setIsValid(true);
    setResultUrl('');

    if (visible) readClipboard();
  }, [visible, readClipboard]);

  const onValueChange = useCallback((text: string) => {
    const lowerCaseText = text.toLowerCase();
    setResultUrl(lowerCaseText.toLowerCase());

    const validUrl = validateGitRepoUrl(lowerCaseText);
    if (validUrl) {
      const {owner, repo} = extractGitUrl(validUrl);
      setDownloadBox({
        name: repo,
        owner: owner,
        url: validUrl,
      });
    } else {
      setDownloadBox(undefined);
    }

    setIsEmpty(!lowerCaseText);
    setIsValid(!!validUrl);
  }, []);

  useEffect(() => {
    const onProgress: GitProgressCallback = (id, state, result) => {
      // If id have string its pull progress, so return early
      if (id) return;
      switch (state) {
        case 'Progress':
          setCloneProgress(result as SimpleGitProgressEvent);
          break;
        case 'Failed':
          setCloneProgress(initGitProgress);
          setCloning(false);
          topToast.danger('Error: Unable to clone the extension.');
          break;
        case 'Completed':
          setCloneProgress(initGitProgress);
          setDownloadBox(undefined);
          setIsEmpty(true);
          setIsValid(true);
          setResultUrl('');
          setCloning(false);
          topToast.success('Extension installed successfully.');
          updateTable();
          break;
      }
    };

    const removeListener = gitIpc.onProgress(onProgress);

    return () => removeListener();
  }, [visible, updateTable]);

  if (!visible) return null;

  return (
    <>
      {!cloning ? (
        <motion.div
          initial="init"
          animate="animate"
          variants={tabContentVariants}
          className="flex flex-col gap-y-2 items-center">
          <TextField
            className="p-1"
            value={resultUrl}
            variant="secondary"
            onChange={onValueChange}
            isInvalid={!isEmpty && !isValid}
            fullWidth>
            <InputGroup>
              <InputGroup.Prefix>
                <GitHub_Icon />
              </InputGroup.Prefix>
              <InputGroup.Input placeholder="Enter a GitHub repository URL..." />
            </InputGroup>
            <FieldError>Please enter a valid GitHub repository URL</FieldError>
          </TextField>
          {downloadBox && (
            <Card
              variant="secondary"
              onClick={!alreadyInstalled ? clone : undefined}
              className={`mt-2 text-center w-full ${!alreadyInstalled && 'cursor-pointer'}`}>
              <Card.Content className="items-center justify-center p-4">
                {alreadyInstalled ? (
                  <span className="font-semibold text-success">This extension has already been installed.</span>
                ) : (
                  <div className="relative flex w-full flex-col items-center justify-center">
                    <DownloadIcon
                      className={'absolute left-7 size-10 opacity-50 transition duration-300 group-hover:opacity-100'}
                    />
                    <div className="flex flex-row items-center justify-center text-lg font-bold">
                      <span>{startCase(downloadBox.name)}</span>
                      <span className="mx-1 scale-85 opacity-75">by</span>
                      <span>{startCase(downloadBox.owner)}</span>
                    </div>
                    <div className="text-sm text-muted">{downloadBox.url}</div>
                  </div>
                )}
              </Card.Content>
            </Card>
          )}
        </motion.div>
      ) : (
        <Card className="mt-4" variant="secondary">
          <Card.Content>
            <ProgressBar size="lg" value={cloneProgress.progress}>
              <Label className="flex flex-row gap-x-3 items-center">
                Stage: {capitalize(cloneProgress.stage)}{' '}
                <Separator className="my-1" variant="tertiary" orientation="vertical" /> Item: {cloneProgress.processed}
                <Separator className="my-1" variant="tertiary" orientation="vertical" /> Total: {cloneProgress.total}
              </Label>
              <ProgressBar.Output />
              <ProgressBar.Track className="bg-surface">
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </Card.Content>
        </Card>
      )}
    </>
  );
}
