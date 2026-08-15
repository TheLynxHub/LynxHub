import {Spinner} from '@heroui/react';
import {extractGitUrl, validateGitRepoUrl} from '@lynx_common/utils';
import gitIpc from '@lynx_shared/ipc/git';
import {startCase} from 'lodash-es';
import {memo, useEffect, useMemo, useRef, useState} from 'react';

import StepProgress from './StepProgress';
import {useInstallStore} from './store';

export interface InstallExtensionsProps {
  /** The list of git repository URLs representing the extensions to clone, along with a target directory inside the base module folder. */
  extensionsURLs: {urls: string[]; dir: string} | undefined;
}

/**
 * Handles the background cloning/installation of any required sub-extensions for a module.
 *
 * @param {InstallExtensionsProps} props - The component props.
 */
const InstallExtensions = memo(({extensionsURLs}: InstallExtensionsProps) => {
  const [current, setCurrent] = useState<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const resolveExtensions = useInstallStore(s => s.resolveExtensions);

  const stepItems = useMemo(
    () =>
      (extensionsURLs?.urls || []).map(url => {
        const validUrl = validateGitRepoUrl(url);
        return startCase(extractGitUrl(validUrl).repo);
      }),
    [extensionsURLs?.urls],
  );

  useEffect(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setCurrent(0);

    async function startInstall() {
      const urls = extensionsURLs?.urls || [];

      for (const [index, extensionsURL] of urls.entries()) {
        try {
          const validUrl = validateGitRepoUrl(extensionsURL);
          await gitIpc.cloneShallowPromise({
            url: validUrl,
            directory: `${extensionsURLs?.dir}/${extractGitUrl(validUrl).repo}`,
            singleBranch: true,
            depth: 1,
          });
        } catch (e) {
          console.error(`Failed to clone extension ${extensionsURL}:`, e);
        } finally {
          setCurrent(index + 1);
        }
      }
      resolveExtensions();
    }

    void startInstall();
  }, [extensionsURLs?.dir, extensionsURLs?.urls, resolveExtensions]);

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      <span className="mt-4 text-xl font-semibold">Installing extensions, Please wait...</span>
      {stepItems.length === 0 ? (
        <Spinner size="lg" color="accent" />
      ) : (
        <StepProgress steps={stepItems} current={current} orientation="vertical" className="w-full max-w-md" />
      )}
    </div>
  );
});

export default InstallExtensions;
