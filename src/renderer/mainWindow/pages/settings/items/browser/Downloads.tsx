import {Button, Card, FieldError, Input, Radio, RadioGroup, Spinner, TextField} from '@heroui/react';
import {topToast} from '@lynx/layouts/ToastProviders';
import downloadManagerIpc from '@lynx_shared/ipc/downloadManager';
import {MoveToFolderIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useMemo, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Custom hook encapsulating state and IPC interactions for browser download settings.
 * Includes fetching, modifying behavior, and resolving file paths.
 */
function useDownloadSettings() {
  const [downloadLocation, setDownloadLocation] = useState<string>('');
  const [downloadBehavior, setDownloadBehavior] = useState<'ask' | 'default'>('default');

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingBehavior, setIsLoadingBehavior] = useState(false);

  const [locationError, setLocationError] = useState<string>('');
  const [behaviorError, setBehaviorError] = useState<string>('');

  // Load current settings on mount
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const [locationResult, behaviorResult] = await Promise.all([
          downloadManagerIpc.invoke.getDownloadLocation(),
          downloadManagerIpc.invoke.getDownloadBehavior(),
        ]);

        if (!isMounted) return;

        if (locationResult.success && locationResult.path) {
          setDownloadLocation(locationResult.path);
          setLocationError('');
        } else if (locationResult.error) {
          setLocationError(locationResult.error);
          topToast.warning(`Failed to load download location: ${locationResult.error}`);
        }

        if (behaviorResult.success && behaviorResult.behavior) {
          setDownloadBehavior(behaviorResult.behavior);
          setBehaviorError('');
        } else if (behaviorResult.error) {
          setBehaviorError(behaviorResult.error);
          topToast.warning(`Failed to load download behavior: ${behaviorResult.error}`);
        }
      } catch (error) {
        console.error('Failed to load download settings:', error);
        if (isMounted) topToast.warning('Failed to load download settings!');
      }
    };

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChangeLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError('');
    try {
      const result = await downloadManagerIpc.invoke.openLocationDialog();
      if (result.success && result.path) {
        setDownloadLocation(result.path);
        setLocationError('');
        topToast.success('Download location updated successfully!');
      } else if (result.error && result.error !== 'Cancelled') {
        setLocationError(result.error);
        topToast.danger(`Failed to update location: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLocationError(errorMessage);
      topToast.danger('Failed to open location dialog!');
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  const handleBehaviorChange = useCallback(async (value: string) => {
    const behavior = value as 'ask' | 'default';
    setIsLoadingBehavior(true);
    setBehaviorError('');
    try {
      const result = await downloadManagerIpc.invoke.setDownloadBehavior(behavior);
      if (result.success) {
        setDownloadBehavior(behavior);
        setBehaviorError('');
        topToast.success('Download behavior updated successfully!');
      } else {
        setBehaviorError(result.error || 'Unknown error');
        topToast.danger(`Failed to update behavior: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setBehaviorError(errorMessage);
      topToast.danger('Failed to update download behavior!');
    } finally {
      setIsLoadingBehavior(false);
    }
  }, []);

  return {
    downloadLocation,
    downloadBehavior,
    isLoadingLocation,
    isLoadingBehavior,
    locationError,
    behaviorError,
    handleChangeLocation,
    handleBehaviorChange,
  };
}

/**
 * Settings component to configure default download behavior and persistent drop folder mappings.
 */
export default function Downloads() {
  const {
    downloadLocation,
    downloadBehavior,
    isLoadingLocation,
    isLoadingBehavior,
    locationError,
    behaviorError,
    handleChangeLocation,
    handleBehaviorChange,
  } = useDownloadSettings();

  const locationTitle = 'Download Location';
  const locationDescription = 'Choose where downloaded files are saved';
  const behaviorTitle = 'Download Behavior';
  const behaviorDescription = 'Control how downloads are handled';

  const locationSearchTexts = useMemo(
    () => [locationTitle, locationDescription, 'download', 'location', 'folder', 'directory', 'save'],
    [],
  );

  const behaviorSearchTexts = useMemo(
    () => [behaviorTitle, behaviorDescription, 'download', 'behavior', 'ask', 'default', 'prompt', 'automatic'],
    [],
  );

  return (
    <>
      <SettingsFilterItem searchTexts={locationSearchTexts}>
        <Card>
          <Card.Header>
            <Card.Title>
              <SettingsSearchHighlight text={locationTitle} />
            </Card.Title>
            <Card.Description>
              <SettingsSearchHighlight text={locationDescription} />
            </Card.Description>
          </Card.Header>

          <Card.Content>
            <TextField isInvalid={!!locationError}>
              <Input variant="secondary" value={downloadLocation} className="text-xs font-JetBrainsMono" />
              <FieldError>Error: {locationError}</FieldError>
            </TextField>
          </Card.Content>

          <Card.Footer>
            <Button variant="tertiary" isPending={isLoadingLocation} onPress={handleChangeLocation} fullWidth>
              {isLoadingLocation ? <Spinner size="sm" color="current" /> : <MoveToFolderIcon className="size-4" />}
              Change Location
            </Button>
          </Card.Footer>
        </Card>
      </SettingsFilterItem>

      <SettingsFilterItem searchTexts={behaviorSearchTexts}>
        <Card>
          <Card.Header>
            <Card.Title>
              <SettingsSearchHighlight text={behaviorTitle} />
            </Card.Title>
            <Card.Description>
              <SettingsSearchHighlight text={behaviorDescription} />
            </Card.Description>
          </Card.Header>

          <Card.Content>
            <RadioGroup
              variant="secondary"
              value={downloadBehavior}
              isInvalid={!!behaviorError}
              isDisabled={isLoadingBehavior}
              onChange={handleBehaviorChange}
              isRequired>
              <div className="flex flex-row gap-x-4 mb-2">
                <Radio value="default" className="mt-0">
                  <Radio.Content>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    <SettingsSearchHighlight text="Use default location" />
                  </Radio.Content>
                </Radio>
                <Radio value="ask" className="mt-0">
                  <Radio.Content>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    <SettingsSearchHighlight text="Always ask where to save" />
                  </Radio.Content>
                </Radio>
              </div>
              <FieldError>Error: {behaviorError}</FieldError>
            </RadioGroup>
          </Card.Content>
        </Card>
      </SettingsFilterItem>
    </>
  );
}
