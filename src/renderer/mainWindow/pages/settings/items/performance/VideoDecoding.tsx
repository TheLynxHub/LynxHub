import LynxSwitch from '@lynx/components/LynxSwitch';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle hardware video decoding.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function VideoDecoding() {
  const dispatch = useDispatch<AppDispatch>();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setEnabled(data.enableAcceleratedVideoDecode);
    });
  }, []);

  const onEnabledChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('performance', {enableAcceleratedVideoDecode: selected});
      setEnabled(selected);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const titleText = 'Hardware Video Decoding';
  const descriptionText = 'Uses GPU for video decoding. Disable if experiencing video playback issues or crashes.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'video',
        'decode',
        'gpu',
        'hardware',
        'playback',
        'hardware video decoding',
        'accelerated video',
        'codec',
        'h264',
        'hevc',
        'av1',
        'vp9',
      ]}>
      <LynxSwitch title={titleText} enabled={enabled} description={descriptionText} onEnabledChange={onEnabledChange} />
    </SettingsFilterItem>
  );
}
