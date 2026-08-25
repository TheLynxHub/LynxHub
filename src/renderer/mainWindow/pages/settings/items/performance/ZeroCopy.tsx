import LynxSwitch from '@lynx/components/LynxSwitch';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle zero-copy GPU buffers.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function ZeroCopy() {
  const dispatch = useDispatch<AppDispatch>();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setEnabled(data.enableZeroCopy);
    });
  }, []);

  const onEnabledChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('performance', {enableZeroCopy: selected});
      setEnabled(selected);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const titleText = 'Zero-Copy GPU Buffers';
  const descriptionText = 'Optimizes GPU memory transfers. Disable if experiencing rendering artifacts.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'zero copy',
        'gpu',
        'memory',
        'buffer',
        'artifact',
        'zero-copy gpu buffers',
        'vram',
        'memory transfer',
      ]}>
      <LynxSwitch title={titleText} enabled={enabled} description={descriptionText} onEnabledChange={onEnabledChange} />
    </SettingsFilterItem>
  );
}
