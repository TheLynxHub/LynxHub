import LynxSwitch from '@lynx/components/LynxSwitch';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle parallel downloading.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function ParallelDownloading() {
  const dispatch = useDispatch<AppDispatch>();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setEnabled(data.enableParallelDownloading);
    });
  }, []);

  const onEnabledChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('performance', {enableParallelDownloading: selected});
      setEnabled(selected);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const titleText = 'Parallel Downloading';
  const descriptionText = 'Enable parallel downloading to accelerate download speed.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'download',
        'downloading',
        'parallel',
        'speed',
        'accelerate',
        'parallel downloading',
        'download acceleration',
        'concurrent downloads',
        'multi-part download',
      ]}>
      <LynxSwitch title={titleText} enabled={enabled} description={descriptionText} onEnabledChange={onEnabledChange} />
    </SettingsFilterItem>
  );
}
