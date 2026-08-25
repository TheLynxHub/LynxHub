import LynxSwitch from '@lynx/components/LynxSwitch';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle High DPI support for scaling on high-resolution displays.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function HighDpi() {
  const dispatch = useDispatch<AppDispatch>();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setEnabled(data.highDpiSupport);
    });
  }, []);

  const onEnabledChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('performance', {highDpiSupport: selected});
      setEnabled(selected);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const titleText = 'High DPI Support';
  const descriptionText = 'Enables better scaling on high-resolution displays. Useful for 4K monitors.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'dpi',
        'high resolution',
        '4k',
        'scaling',
        'display',
        'high dpi support',
        'retina',
        'hidpi',
        'display scaling',
      ]}>
      <LynxSwitch title={titleText} enabled={enabled} description={descriptionText} onEnabledChange={onEnabledChange} />
    </SettingsFilterItem>
  );
}
