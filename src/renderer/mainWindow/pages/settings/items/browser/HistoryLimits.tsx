import {Card, Description, FieldError, Label, NumberField} from '@heroui/react';
import {topToast} from '@lynx/layouts/ToastProviders';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

const DEFAULT_LIMITS = {recentAddress: 100, historyAddress: 1000, favoriteAddress: 500, favIcons: 100};

/**
 * Custom hook to load and persist browser history size limits from storage.
 */
function useHistoryLimits() {
  const [limits, setLimits] = useState(DEFAULT_LIMITS);

  useEffect(() => {
    let isMounted = true;

    storageIpc.get('browser').then(browser => {
      if (!isMounted) return;
      if (browser.historyLimits) setLimits(browser.historyLimits);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveLimits = useCallback(async (updated: typeof limits) => {
    try {
      await storageIpc.update('browser', {historyLimits: updated});
      setLimits(updated);
      topToast.success('History limits updated!');
    } catch {
      topToast.danger('Failed to update history limits!');
    }
  }, []);

  const handleChange = useCallback(
    (key: keyof typeof DEFAULT_LIMITS, value: number) => {
      if (!Number.isFinite(value) || value < 1) return;
      saveLimits({...limits, [key]: value});
    },
    [limits, saveLimits],
  );

  return {limits, handleChange};
}

const LIMIT_FIELDS: {key: keyof typeof DEFAULT_LIMITS; label: string; description: string; min: number; max: number}[] =
  [
    {
      key: 'historyAddress',
      label: 'History Limit',
      description: 'Maximum number of visited URLs stored in history',
      min: 10,
      max: 10000,
    },
    {
      key: 'recentAddress',
      label: 'Recent Addresses Limit',
      description: 'Maximum number of recently typed addresses kept in the address bar dropdown',
      min: 5,
      max: 500,
    },
    {
      key: 'favoriteAddress',
      label: 'Favorites Limit',
      description: 'Maximum number of saved favorite URLs',
      min: 10,
      max: 5000,
    },
    {
      key: 'favIcons',
      label: 'Fav Icons Limit',
      description: 'Maximum number of cached site favicons stored locally',
      min: 10,
      max: 1000,
    },
  ];

/**
 * Settings component allowing users to configure the maximum size of each browser
 * URL storage array (history, recent addresses, favorites).
 */
export default function HistoryLimits() {
  const {limits, handleChange} = useHistoryLimits();

  const filterSearchTexts = [
    'History Limits',
    'History Limit',
    'Recent Addresses Limit',
    'Favorites Limit',
    'Fav Icons Limit',
    'browser history size',
    'max history',
    'url limit',
    'address limit',
    'favicon limit',
    'fav icons',
    'history retention',
    'recent addresses',
    'browser limits',
  ];

  return (
    <SettingsFilterItem searchTexts={filterSearchTexts}>
      <Card>
        <Card.Header>
          <Card.Title>
            <SettingsSearchHighlight text="History Limits" />
          </Card.Title>
          <Card.Description>
            <SettingsSearchHighlight text="Configure maximum number of URLs stored per browser list" />
          </Card.Description>
        </Card.Header>

        <Card.Content className="flex flex-col gap-4">
          {LIMIT_FIELDS.map(({key, label, description, min, max}) => (
            <NumberField
              key={key}
              step={10}
              minValue={min}
              maxValue={max}
              variant="secondary"
              value={limits[key]}
              onChange={value => handleChange(key, value)}
              fullWidth>
              <Label>
                <SettingsSearchHighlight text={label} />
              </Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
              <Description className="text-xs">
                <SettingsSearchHighlight text={description} />
              </Description>
              <FieldError />
            </NumberField>
          ))}
        </Card.Content>
      </Card>
    </SettingsFilterItem>
  );
}
