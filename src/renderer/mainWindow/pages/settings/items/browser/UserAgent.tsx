import {Button, Description, Input, Key, Label, ListBox, Select} from '@heroui/react';
import {topToast} from '@lynx/layouts/ToastProviders';
import {AgentTypes} from '@lynx_common/types/ipc';
import browserIpc from '@lynx_shared/ipc/browser';
import storageIpc from '@lynx_shared/ipc/storage';
import {DisketteIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Interface representing a user agent option fetched from the IPC.
 */
interface UserAgentOption {
  id: AgentTypes;
  value: string | undefined;
}

/**
 * Custom hook to manage fetching and updating user agent settings.
 * Synchronizes the visual state and external storage for browser user agent configuration.
 */
function useUserAgentSettings() {
  const [selectedAgent, setSelectedAgent] = useState<AgentTypes | undefined>('lynxhub');
  const [customValue, setCustomValue] = useState<string>('');
  const [agentDescriptions, setAgentDescriptions] = useState<UserAgentOption[]>([]);

  // Fetch initial configuration on mount
  useEffect(() => {
    let isMounted = true;

    const fetchAgents = async () => {
      try {
        const {userAgent, customUserAgent} = await storageIpc.get('browser');

        if (!isMounted) return;

        setSelectedAgent(userAgent);
        if (userAgent === 'custom' && customUserAgent) {
          setCustomValue(customUserAgent);
        }

        const [lynxhubValue, electronValue, chromeValue, customAgentValue] = await Promise.all([
          browserIpc.invoke.getUserAgent('lynxhub'),
          browserIpc.invoke.getUserAgent('electron'),
          browserIpc.invoke.getUserAgent('chrome'),
          browserIpc.invoke.getUserAgent('custom'),
        ]);

        if (!isMounted) return;

        setAgentDescriptions([
          {id: 'lynxhub', value: lynxhubValue},
          {id: 'electron', value: electronValue},
          {id: 'chrome', value: chromeValue},
          {id: 'custom', value: customAgentValue},
        ]);
      } catch (error) {
        console.error('Failed to resolve user agent values:', error);
      }
    };

    fetchAgents();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handler for agent selection drop down
  const handleAgentSelection = useCallback((key: Key | null) => {
    if (!key || typeof key === 'number') return;

    const value = key as AgentTypes;
    if (!value) return;

    setSelectedAgent(value);

    // If changing to custom, load any previously stored custom agent value
    if (value === 'custom') {
      storageIpc
        .get('browser')
        .then(result => {
          if (result?.customUserAgent) {
            setCustomValue(result.customUserAgent);
          }
        })
        .catch(err => {
          console.error('Failed to load custom user agent:', err);
        });
    }

    // Persist new selection and update live browser context
    storageIpc.update('browser', {userAgent: value});
    browserIpc.send.updateUserAgent();
  }, []);

  // Save changes to the custom text string explicitly
  const saveCustomAgent = useCallback(() => {
    storageIpc.update('browser', {customUserAgent: customValue, userAgent: 'custom'});
    topToast.success('Custom user agent saved successfully!');
  }, [customValue]);

  return {
    selectedAgent,
    customValue,
    setCustomValue,
    agentDescriptions,
    handleAgentSelection,
    saveCustomAgent,
  };
}

/**
 * Settings component to configure the user agent mimicking behavior.
 * Lets users switch between basic built-in presets or define their own custom user agent header.
 */
export default function UserAgent() {
  const {selectedAgent, customValue, setCustomValue, agentDescriptions, handleAgentSelection, saveCustomAgent} =
    useUserAgentSettings();

  const getAgentDescription = (id: AgentTypes) => {
    return agentDescriptions.find(d => d.id === id)?.value || undefined;
  };

  const filterSearchTexts = ['User Agent', 'browser', 'user agent', 'lynxhub', 'electron', 'chrome', 'custom', 'ua'];

  return (
    <SettingsFilterItem searchTexts={filterSearchTexts}>
      <div className="flex flex-col gap-y-2">
        <Select value={selectedAgent} onChange={handleAgentSelection}>
          <Label>
            <SettingsSearchHighlight text="User Agent" />
          </Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="lynxhub" textValue="LynxHub (Default)">
                <ListBox.ItemIndicator />
                <div className="flex flex-col">
                  <Label>LynxHub (Default)</Label>
                  <Description>
                    <SettingsSearchHighlight text={getAgentDescription('lynxhub')} />
                  </Description>
                </div>
              </ListBox.Item>
              <ListBox.Item id="electron" textValue="Electron">
                <ListBox.ItemIndicator />
                <div className="flex flex-col">
                  <Label>Electron</Label>
                  <Description>
                    <SettingsSearchHighlight text={getAgentDescription('electron')} />
                  </Description>
                </div>
              </ListBox.Item>
              <ListBox.Item id="chrome" textValue="Chrome">
                <ListBox.ItemIndicator />
                <div className="flex flex-col">
                  <Label>Chrome</Label>
                  <Description>
                    <SettingsSearchHighlight text={getAgentDescription('chrome')} />
                  </Description>
                </div>
              </ListBox.Item>
              <ListBox.Item id="custom" textValue="Custom">
                <ListBox.ItemIndicator />
                <div className="flex flex-col">
                  <Label>Custom</Label>
                  <Description>
                    <SettingsSearchHighlight text={getAgentDescription('custom')} />
                  </Description>
                </div>
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>

        {selectedAgent === 'custom' && (
          <div className="flex w-full flex-row items-center gap-x-2">
            <Input
              value={customValue}
              aria-label="Custom User Agent Input"
              placeholder="Enter custom User-Agent string..."
              onChange={event => setCustomValue(event.target.value)}
              fullWidth
            />
            <Button
              size="sm"
              variant="primary"
              className="shrink-0"
              onPress={saveCustomAgent}
              aria-label="Save custom user agent"
              isIconOnly>
              <DisketteIcon />
            </Button>
          </div>
        )}
      </div>
    </SettingsFilterItem>
  );
}
