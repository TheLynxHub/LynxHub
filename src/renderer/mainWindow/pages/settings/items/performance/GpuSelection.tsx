import LynxSwitch from '@lynx/components/LynxSwitch';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle forcing high-performance GPU selection.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function GpuSelection() {
  const dispatch = useDispatch<AppDispatch>();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setEnabled(data.forceHighPerformanceGpu);
    });
  }, []);

  const onEnabledChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('performance', {forceHighPerformanceGpu: selected});
      setEnabled(selected);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const titleText = 'Force High-Performance GPU';
  const descriptionText =
    'Uses dedicated GPU instead of integrated graphics. Useful for multi-GPU systems (laptops with discrete graphics).';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'gpu',
        'dedicated',
        'discrete',
        'integrated',
        'graphics',
        'laptop',
        'force high-performance gpu',
        'nvidia',
        'amd',
        'intel iris',
        'discrete graphics',
      ]}>
      <LynxSwitch title={titleText} enabled={enabled} description={descriptionText} onEnabledChange={onEnabledChange} />
    </SettingsFilterItem>
  );
}
