import LynxSwitch from '@lynx/components/LynxSwitch';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {ShieldWarningIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle disabling GPU VSync.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function Vsync() {
  const dispatch = useDispatch<AppDispatch>();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setEnabled(data.disableGpuVsync);
    });
  }, []);

  const onEnabledChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('performance', {disableGpuVsync: selected});
      setEnabled(selected);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const titleText = 'Disable GPU VSync';
  const descriptionText = 'May cause screen tearing but reduces input latency.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'vsync',
        'tearing',
        'latency',
        'input lag',
        'gaming',
        'disable gpu vsync',
        'vertical sync',
        'frame sync',
      ]}>
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
