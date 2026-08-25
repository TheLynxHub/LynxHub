import LynxSwitch from '@lynx/components/LynxSwitch';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle Skia Graphite.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function SkiaGraphite() {
  const dispatch = useDispatch<AppDispatch>();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setEnabled(data.enableSkiaGraphite);
    });
  }, []);

  const onEnabledChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('performance', {enableSkiaGraphite: selected});
      setEnabled(selected);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const titleText = 'Enable Skia Graphite';
  const descriptionText = 'Enable Skia Graphite. This will use the Dawn backend by default.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'skia',
        'graphite',
        'dawn',
        'rendering',
        'backend',
        'enable skia graphite',
        'vulkan',
        'metal',
        'directx',
        'graphite rendering',
      ]}>
      <LynxSwitch title={titleText} enabled={enabled} description={descriptionText} onEnabledChange={onEnabledChange} />
    </SettingsFilterItem>
  );
}
