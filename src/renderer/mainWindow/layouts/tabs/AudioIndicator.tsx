import {Button} from '@heroui/react';
import {useVolumeState, volumeActions} from '@lynx/redux/reducers/volume';
import {AppDispatch} from '@lynx/redux/store';
import browserIpc from '@lynx_shared/ipc/browser';
import {VolumeCrossIcon, VolumeLoudIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback, useMemo} from 'react';
import {useDispatch} from 'react-redux';

type Props = {
  tabId: string;
  id: string;
};

/**
 * Component that displays an audio indicator for a tab.
 * Allows toggling mute state for the tab.
 */
const AudioIndicator = memo(({tabId, id}: Props) => {
  const dispatch = useDispatch<AppDispatch>();
  const tabAudioPlaying = useVolumeState('tabAudioPlaying');
  const tabMuted = useVolumeState('tabMuted');
  const globalMuted = useVolumeState('globalMuted');

  const isPlaying = tabAudioPlaying[tabId] || false;
  const isMuted = tabMuted[tabId] || false;

  const handleMuteToggle = useCallback(async () => {
    const newMutedState = !isMuted;

    // Optimistically update UI
    dispatch(volumeActions.setTabMuted({tabId, muted: newMutedState}));

    try {
      // Apply effective mute: tab is muted if either tab mute OR global mute is enabled
      const effectiveMute = newMutedState || globalMuted;
      await browserIpc.invoke.setMuted(id, effectiveMute);
    } catch (error) {
      console.error('Failed to toggle mute state:', error);
      // Revert on error
      dispatch(volumeActions.setTabMuted({tabId, muted: !newMutedState}));
    }
  }, [dispatch, id, tabId, isMuted, globalMuted]);

  const icon = useMemo(
    () => (isMuted ? <VolumeCrossIcon className="shrink-0" /> : <VolumeLoudIcon className="shrink-0" />),
    [isMuted],
  );

  const ariaLabel = isMuted ? 'Unmute tab audio' : 'Mute tab audio';
  const ariaDescription = isPlaying ? 'Audio is currently playing' : 'Audio indicator';

  // Don't render if not playing and not muted
  if (!isPlaying && !isMuted) {
    return null;
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={ariaLabel}
      aria-pressed={isMuted}
      onPress={handleMuteToggle}
      className="scale-85 shrink-0"
      aria-description={ariaDescription}
      isIconOnly>
      {icon}
    </Button>
  );
});

export default AudioIndicator;
