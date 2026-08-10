import {Button} from '@heroui/react';
import applicationIpc from '@lynx_shared/ipc/application';
import {CheckCircleIcon, ShieldCrossIcon} from '@solar-icons/react/bold-duotone';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import {topToast} from '../../../layouts/ToastProviders';
import {settingsActions} from '../../../redux/reducers/settings';
import {AppDispatch} from '../../../redux/store';
import EmptyStateCard from '../../EmptyStateCard';

type Props = {errMsg?: string; success: boolean; tryAgain: () => void; cancel: () => void; onClose: () => void};

/** Install download app update */
export default function Downloaded({errMsg, success, tryAgain, cancel, onClose}: Props) {
  const dispatch = useDispatch<AppDispatch>();

  const installLater = useCallback(() => {
    dispatch(settingsActions.setSettingsState({key: 'updateAvailable', value: false}));
    topToast.info('App will be updated when closed.');
    onClose();
  }, [onClose]);

  const install = useCallback(() => {
    applicationIpc.send.updateInstall();
    onClose();
  }, [onClose]);

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 py-4 mt-2 text-center">
      {success ? (
        <EmptyStateCard
          action={
            <div className="flex gap-4 mt-2">
              <Button variant="secondary" onPress={installLater}>
                Restart Later
              </Button>
              <Button onPress={install}>Restart Now</Button>
            </div>
          }
          className="w-90"
          variant="secondary"
          title="Update Successfully Downloaded"
          icon={<CheckCircleIcon className="size-18 text-success" />}
          description="The update will be installed when you restart the application."
        />
      ) : (
        <EmptyStateCard
          action={
            <div className="flex gap-4 mt-2">
              <Button onPress={cancel} variant="danger-soft">
                Cancel
              </Button>
              <Button onPress={tryAgain}>Try Again</Button>
            </div>
          }
          className="w-90"
          variant="secondary"
          title="Download Failed"
          description={errMsg || 'An unknown error occurred.'}
          icon={<ShieldCrossIcon className="size-18 text-danger" />}
        />
      )}
    </div>
  );
}
