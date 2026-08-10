import {Button, Modal} from '@heroui/react';
import {SiGithub} from '@icons-pack/react-simple-icons';
import {appActions, useAppState} from '@lynx/redux/reducers/app';
import {useUserState} from '@lynx/redux/reducers/user';
import {GITHUB_URL} from '@lynx_common/consts';
import storageIpc from '@lynx_shared/ipc/storage';
import userIpc from '@lynx_shared/ipc/user';
import {StarIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useState} from 'react';
import {useDispatch} from 'react-redux';

import TabModal from '../TabModal';

/**
 * Modal that prompts users to star the GitHub repository
 * after they have active usage of 3 days and 3 hours (or 10 active days).
 * Adapts dynamically based on whether the user's GitHub account is connected.
 */
export default function StarRepoModal() {
  const showStarPromo = useAppState('showStarPromo');
  const dispatch = useDispatch();
  const userData = useUserState('userData');
  const isGitHubConnected = userData?.connectedProviders?.includes('github') || false;

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = useCallback(
    (starred: boolean) => {
      dispatch(appActions.setAppState({key: 'showStarPromo', value: false}));
      storageIpc.update('app', {hasSeenStarPromo: true});
      if (starred) {
        storageIpc.update('app', {hasStarredRepo: true});
      }
      // Reset state for next mount if applicable
      setTimeout(() => {
        setError(null);
        setSuccess(false);
        setIsPending(false);
      }, 300);
    },
    [dispatch],
  );

  const handleStar = useCallback(async () => {
    setIsPending(true);
    setError(null);
    try {
      const res = await userIpc.account.starGitHubRepo();
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          handleClose(true);
        }, 1500);
      } else {
        setError(res.error || 'Failed to star repository.');
        setIsPending(false);
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      setIsPending(false);
    }
  }, [handleClose]);

  const handleManualStar = useCallback(() => {
    window.open(GITHUB_URL);
    handleClose(true); // Treat as starred/handled since they are going to github
  }, [handleClose]);

  return (
    <TabModal size="lg" isOpen={showStarPromo} onOpenChange={() => handleClose(false)} isKeyboardDismissDisabled>
      <Modal.Header>
        <Modal.Heading className="flex items-center gap-x-2 text-warning">
          <StarIcon className="size-6 shrink-0 animate-pulse" />
          <span>Support LynxHub on GitHub</span>
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground select-none">
          I hope you are enjoying your experience with LynxHub! If you do, please consider starring LynxHub official
          repository on GitHub. It helps increase project visibility and supports my ongoing development.
        </p>

        <div className="flex gap-3 bg-default/40 p-4 rounded-2xl border border-divider/50 items-center">
          <div className="p-2.5 bg-warning/10 rounded-xl inline-flex shrink-0">
            <SiGithub className="size-6 text-foreground shrink-0" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-foreground">TheLynxHub/LynxHub</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed select-none">
              Starring is completely free and takes just a second.
            </p>
          </div>
        </div>

        {error && (
          <div className="text-xs text-danger bg-danger/10 px-3 py-2 rounded-xl border border-danger/20 select-none">
            {error}
            <span className="block mt-1">
              You can also{' '}
              <button
                onClick={handleManualStar}
                className="underline hover:text-danger-600 font-semibold cursor-pointer">
                star it manually in the browser
              </button>
              .
            </span>
          </div>
        )}

        {success && (
          <div
            className={
              'text-xs text-success bg-success/10 px-3 py-2 rounded-xl ' +
              'border border-success/20 select-none font-medium text-center'
            }>
            Repository starred successfully! Thank you so much for your support! ❤️
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="tertiary" isDisabled={isPending || success} onPress={() => handleClose(false)}>
          Maybe Later
        </Button>
        {isGitHubConnected ? (
          <Button
            variant="primary"
            onPress={handleStar}
            isDisabled={success}
            isPending={isPending}
            className="font-bold cursor-pointer">
            {!isPending && <StarIcon className="size-4 shrink-0" />}
            {success ? 'Starred!' : 'Star Repository'}
          </Button>
        ) : (
          <Button variant="primary" onPress={handleManualStar} className="font-bold cursor-pointer">
            <StarIcon className="size-4 shrink-0" />
            Star on GitHub
          </Button>
        )}
      </Modal.Footer>
    </TabModal>
  );
}
