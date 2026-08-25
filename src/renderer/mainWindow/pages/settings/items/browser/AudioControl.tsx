import {Card, Switch} from '@heroui/react';
import {topToast} from '@lynx/layouts/ToastProviders';
import {useCardsState} from '@lynx/redux/reducers/cards';
import {useVolumeState, volumeActions} from '@lynx/redux/reducers/volume';
import {AppDispatch} from '@lynx/redux/store';
import browserIpc from '@lynx_shared/ipc/browser';
import storageIpc from '@lynx_shared/ipc/storage';
import {VolumeCrossIcon, VolumeIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Custom hook encapsulating logic for managing and persisting global audio mute settings.
 * Synchronizes the setting with browser tabs dynamically.
 */
function useAudioControlSettings() {
  const dispatch = useDispatch<AppDispatch>();
  const globalMuted = useVolumeState('globalMuted');
  const tabMuted = useVolumeState('tabMuted');
  const runningCards = useCardsState('runningCard');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize browser tabs to avoid recalculation
  const browserTabs = useMemo(() => runningCards.filter(card => card.type === 'browser'), [runningCards]);

  // Apply global mute to all active browser tabs
  const applyGlobalMuteToAllTabs = useCallback(
    async (muted: boolean) => {
      for (const card of browserTabs) {
        const isTabMuted = tabMuted[card.tabId] ?? false;
        const effectiveMute = isTabMuted || muted;

        try {
          await browserIpc.invoke.setMuted(card.id, effectiveMute);
        } catch (error) {
          console.error(`Failed to apply mute to tab ${card.tabId}:`, error);
        }
      }
    },
    [browserTabs, tabMuted],
  );

  // Debounced save to storage
  const saveToStorage = useCallback(async (muted: boolean) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const currentData = await storageIpc.get('browser');
        const currentSettings = currentData.volumeSettings || {
          globalMuted: false,
          tabVolumes: {},
        };

        await storageIpc.update('browser', {
          volumeSettings: {
            ...currentSettings,
            globalMuted: muted,
          },
        });
      } catch (error) {
        console.error('Failed to save volume settings:', error);
        topToast.danger('Failed to save volume settings!');
      }
    }, 500);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleMuteToggle = useCallback(
    (checked: boolean) => {
      try {
        dispatch(volumeActions.setGlobalMuted(checked));
        saveToStorage(checked);
        applyGlobalMuteToAllTabs(checked);
      } catch (error) {
        console.error('Failed to toggle global mute:', error);
        topToast.danger('Failed to toggle global mute');
      }
    },
    [dispatch, saveToStorage, applyGlobalMuteToAllTabs],
  );

  return {
    globalMuted,
    handleMuteToggle,
  };
}

/**
 * Settings component controlling global audio mute behavior.
 */
export default function AudioControl() {
  const {globalMuted, handleMuteToggle} = useAudioControlSettings();

  const muteTitle = 'Global Mute';
  const muteDescription =
    'Mute all browser audio. Individual tab mute controls remain functional' +
    ' but have no audible effect when global mute is enabled.';

  const muteSearchTexts = useMemo(
    () => [
      muteTitle,
      muteDescription,
      'audio',
      'mute',
      'silence',
      'sound',
      'global',
      'all',
      'tabs',
      'global mute',
      'volume',
      'speaker',
      'browser audio',
    ],
    [],
  );

  return (
    <SettingsFilterItem searchTexts={muteSearchTexts}>
      <Card>
        <Card.Header>
          <Card.Title>
            <SettingsSearchHighlight text={muteTitle} />
          </Card.Title>
          <Card.Description>
            <SettingsSearchHighlight text={muteDescription} />
          </Card.Description>
        </Card.Header>

        <Card.Content>
          <Switch isSelected={globalMuted} onChange={handleMuteToggle} aria-label="Global mute toggle">
            <Switch.Content className="flex flex-row items-center gap-x-2">
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              {globalMuted ? (
                <VolumeCrossIcon aria-hidden="true" className="size-4.5 shrink-0 text-danger" />
              ) : (
                <VolumeIcon aria-hidden="true" className="size-5 shrink-0 text-muted" />
              )}
              <SettingsSearchHighlight text={globalMuted ? 'All audio muted' : 'Audio enabled'} />
            </Switch.Content>
          </Switch>
        </Card.Content>
      </Card>
    </SettingsFilterItem>
  );
}
