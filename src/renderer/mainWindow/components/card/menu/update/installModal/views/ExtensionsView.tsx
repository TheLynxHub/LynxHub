import {Spinner} from '@heroui/react';
import {extractGitUrl, validateGitRepoUrl} from '@lynx_common/utils';
import gitIpc from '@lynx_shared/ipc/git';
import {startCase} from 'lodash-es';
import {memo, useEffect, useMemo, useRef, useState} from 'react';

import StepProgress from '../components/StepProgress';
import {useInstallStore} from '../store';

/**
 * Handles sequential background cloning and installation of required sub-extensions for a module.
 */
function ExtensionsView() {
  const extensionsURLs = useInstallStore(s => s.extensionsToInstall);
  const resolveExtensions = useInstallStore(s => s.resolveExtensions);

  const [current, setCurrent] = useState<number>(0);
  const isRunningRef = useRef<boolean>(false);

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
      <span className="mt-4 text-xl font-semibold">Installing extensions, please wait...</span>
      {stepItems.length === 0 ? (
        <Spinner size="lg" color="accent" />
      ) : (
        <StepProgress steps={stepItems} current={current} orientation="vertical" className="w-full max-w-md" />
      )}
    </div>
  );
}

export default memo(ExtensionsView);
