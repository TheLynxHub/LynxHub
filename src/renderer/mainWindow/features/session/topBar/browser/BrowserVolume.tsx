import {Button} from '@heroui/react';
import {useVolumeState} from '@lynx/redux/reducers/volume';
import browserIpc from '@lynx_shared/ipc/browser';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {VolumeCrossIcon, VolumeIcon, VolumeLoudIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback, useMemo, useRef} from 'react';

import LynxTooltip from '../../../../components/LynxTooltip';

type Props = {
  /**
   * The ID of the browser/card.
   */
  id: string;
  /**
   * The ID of the tab.
   */
  tabId: string;
};

/**
 * A button to control the volume of the browser tab.
 */
const BrowserVolume = memo(({id, tabId}: Props) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const tabAudioPlaying = useVolumeState('tabAudioPlaying');
  const tabMuted = useVolumeState('tabMuted');
  const tabVolumes = useVolumeState('tabVolumes');
  const globalMuted = useVolumeState('globalMuted');

  const isPlaying = tabAudioPlaying[tabId] || false;
  const isMuted = tabMuted[tabId] || false;
  const volume = tabVolumes[tabId] ?? 100;

  const openVolumeMenu = useCallback(() => {
    AddBreadcrumb_Renderer('Browser: Open volume control');
    const bounds = btnRef.current?.getBoundingClientRect();
    if (bounds) {
      const {x, y} = bounds;
      browserIpc.send.openVolume({id, tabId, volume, muted: isMuted, globalMuted}, {x: x - 125, y: y + 30});
    } else {
      browserIpc.send.openVolume({id, tabId, volume, muted: isMuted, globalMuted});
    }
  }, [id, tabId, volume, isMuted, globalMuted]);

  const icon = useMemo(() => {
    if (isMuted || globalMuted) {
      return <VolumeCrossIcon className="size-4" />;
    }
    if (volume > 50) {
      return <VolumeLoudIcon className="size-4" />;
    }
    return <VolumeIcon className="size-4" />;
  }, [isMuted, globalMuted, volume]);

  const ariaLabel = useMemo(() => {
    if (isMuted || globalMuted) {
      return 'Volume control (muted)';
    }
    if (isPlaying) {
      return 'Volume control (playing)';
    }
    return 'Volume control';
  }, [isMuted, globalMuted, isPlaying]);

  const ariaDescription = useMemo(() => {
    const parts: string[] = [];
    if (isMuted || globalMuted) {
      parts.push('Audio is muted');
    }
    if (isPlaying) {
      parts.push('Audio is playing');
    }
    parts.push(`Current volume: ${volume} percent`);
    return parts.join('. ');
  }, [isMuted, globalMuted, isPlaying, volume]);

  return (
    <LynxTooltip delay={1000} content={ariaLabel}>
      <Button
        size="sm"
        ref={btnRef}
        variant="ghost"
        aria-label={ariaLabel}
        onPress={openVolumeMenu}
        aria-description={ariaDescription}
        isIconOnly>
        {icon}
      </Button>
    </LynxTooltip>
  );
});

BrowserVolume.displayName = 'BrowserVolume';

export default BrowserVolume;
