import {Button, Disclosure} from '@heroui/react';
import CopyClipboard from '@lynx/components/CopyClipboard';
import browserIpc from '@lynx_shared/ipc/browser';
import {RestartIcon, UnlinkIcon} from '@solar-icons/react/bold-duotone';
import {motion} from 'framer-motion';
import {memo, useEffect} from 'react';

export type FailedLoad = {errorCode: number; errorDescription: string; validatedURL: string};

type Props = {
  error: FailedLoad;
  onReload: () => void;
  id: string;
};

const BrowserError = memo(({error, onReload, id}: Props) => {
  const details = `URL: ${error.validatedURL}\nError Code: ${error.errorCode}\nDescription: ${error.errorDescription}`;

  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (e.button === 3) {
        browserIpc.send.goBack(id);
      } else if (e.button === 4) {
        browserIpc.send.goForward(id);
      }
    };

    window.addEventListener('mouseup', listener);

    return () => {
      window.removeEventListener('mouseup', listener);
    };
  }, []);

  return (
    <div className="flex h-full w-full select-none items-center justify-center bg-surface p-8">
      <motion.div
        initial={{opacity: 0, translateY: 5}}
        animate={{opacity: 1, translateY: 0, transition: {delay: 0.2}}}
        className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <UnlinkIcon className="size-20 text-warning" />
        <div className="flex w-full flex-col gap-2">
          <div>
            <h1 className="text-2xl font-bold text-warning">This page isn't available</h1>
          </div>
          <p title={error.validatedURL} className="w-full line-clamp-2 text-sm text-muted">
            Could not load <span className="font-medium">{error.validatedURL}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button className="w-36" onPress={onReload}>
            <RestartIcon />
            Reload
          </Button>
        </div>

        <div className="text-left text-sm text-muted">
          <p className="font-semibold">Try these suggestions:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Check your internet connection</li>
            <li>Make sure the URL is spelled correctly</li>
            <li>If the problem persists, the site may be down</li>
          </ul>
        </div>

        <Disclosure>
          <Disclosure.Heading className="flex items-center gap-x-2 justify-center mb-4 mt-2">
            <Button slot="trigger" className="w-60" variant="secondary">
              Details
              <Disclosure.Indicator />
            </Button>
            <CopyClipboard contentToCopy={details} tooltipTitle="Copy error details to clipboard" />
          </Disclosure.Heading>
          <Disclosure.Content>
            <div className="flex flex-col gap-3 font-JetBrainsMono">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1 rounded-2xl bg-surface-secondary p-3">
                  <span className="text-xs font-semibold text-muted">URL</span>
                  <code className="break-all text-xs text-muted">{error.validatedURL}</code>
                </div>

                <div className="flex flex-col gap-1 rounded-2xl bg-surface-secondary p-3 ">
                  <span className="text-xs font-semibold text-danger">Error Code</span>
                  <code className="text-xs text-danger">{error.errorCode}</code>
                </div>

                <div className="flex flex-col gap-1 rounded-2xl bg-surface-secondary p-3 ">
                  <span className="text-xs font-semibold text-warning">Description</span>
                  <code className="break-all text-xs text-warning">{error.errorDescription}</code>
                </div>
              </div>
            </div>
          </Disclosure.Content>
        </Disclosure>
      </motion.div>
    </div>
  );
});

export default BrowserError;
