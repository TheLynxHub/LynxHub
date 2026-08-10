import LynxSwitch from '@lynx/components/LynxSwitch';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {ShieldWarningIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle the disabled frame rate limit.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function FrameRate() {
  const dispatch = useDispatch<AppDispatch>();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setEnabled(data.disableFrameRateLimit);
    });
  }, []);

  const onEnabledChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('performance', {disableFrameRateLimit: selected});
      setEnabled(selected);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const titleText = 'Disable Frame Rate Limit';
  const descriptionText =
    'Removes FPS cap. May increase power consumption and heat generation on less powerful devices.';

  return (
    <SettingsFilterItem searchTexts={[titleText, descriptionText, 'fps', 'frame rate', 'limit', 'power', 'heat']}>
      <LynxSwitch
        title={titleText}
        enabled={enabled}
        description={descriptionText}
        onEnabledChange={onEnabledChange}
        icon={<ShieldWarningIcon className="text-warning size-5" />}
      />
    </SettingsFilterItem>
  );
}
