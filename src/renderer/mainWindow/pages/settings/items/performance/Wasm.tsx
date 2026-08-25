import LynxSwitch from '@lynx/components/LynxSwitch';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle WebAssembly SIMD optimizations.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function Wasm() {
  const dispatch = useDispatch<AppDispatch>();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setEnabled(data.enableWebAssemblySimd);
    });
  }, []);

  const onEnabledChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('performance', {enableWebAssemblySimd: selected});
      setEnabled(selected);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const titleText = 'WebAssembly SIMD';
  const descriptionText = 'Enables SIMD optimizations for WebAssembly applications. Improves WASM performance.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'webassembly',
        'wasm',
        'simd',
        'performance',
        'vector instructions',
        'webassembly simd',
      ]}>
      <LynxSwitch title={titleText} enabled={enabled} description={descriptionText} onEnabledChange={onEnabledChange} />
    </SettingsFilterItem>
  );
}
