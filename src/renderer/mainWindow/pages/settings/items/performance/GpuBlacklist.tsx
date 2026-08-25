import LynxSwitch from '@lynx/components/LynxSwitch';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {ShieldWarningIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle whether to ignore the GPU blacklist.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function GpuBlacklist() {
  const dispatch = useDispatch<AppDispatch>();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setEnabled(data.ignoreGpuBlocklist);
    });
  }, []);

  const onEnabledChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('performance', {ignoreGpuBlocklist: selected});
      setEnabled(selected);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const titleText = 'Ignore GPU Blocklist';
  const descriptionText =
    'Overrides GPU driver compatibility checks. May cause crashes or visual' +
    ' artifacts on older or unsupported hardware.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'gpu',
        'blocklist',
        'blacklist',
        'driver',
        'compatibility',
        'crash',
        'ignore gpu blocklist',
        'hardware acceleration',
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
