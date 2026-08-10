import {Button, Card, Checkbox, CheckboxGroup, Spinner} from '@heroui/react';
import {topToast} from '@lynx/layouts/ToastProviders';
import {AppDispatch} from '@lynx/redux/store';
import browserIpc from '@lynx_shared/ipc/browser';
import {BroomIcon} from '@solar-icons/react/bold-duotone';
import isEmpty from 'lodash/isEmpty';
import {useCallback, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Available browser data types that can be cleared by the user.
 */
const BROWSER_DATA_OPTIONS = [
  {value: 'cache', label: 'Cache'},
  {value: 'cookies', label: 'Cookies'},
  {value: 'favorites', label: 'Favorites'},
  {value: 'history', label: 'History'},
  {value: 'fav-icons', label: 'Fav Icons'},
] as const;

/**
 * Custom hook encapsulating the logic to clear various browser data fragments.
 * Handles the loading states and sequentially invokes appropriate IPC clear commands.
 */
function useClearBrowserData() {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState(false);

  const performClearData = useCallback(async () => {
    if (isEmpty(selectedOptions)) return;

    setIsClearing(true);

    try {
      if (selectedOptions.includes('cache')) {
        await browserIpc.invoke.clearCache();
      }
      if (selectedOptions.includes('cookies')) {
        await browserIpc.invoke.clearCookies();
      }

      const historyRelatedSelections = ['favorites', 'history', 'fav-icons'];
      if (historyRelatedSelections.some(item => selectedOptions.includes(item))) {
        browserIpc.send.clearHistory(selectedOptions);
      }

      // Small UI delay to indicate action completion smoothly
      setTimeout(() => {
        topToast.success('Selected data cleared successfully!');
        setSelectedOptions([]);
        setIsClearing(false);
      }, 300);
    } catch (error) {
      console.error('Failed to clear browser data:', error);
      topToast.warning('Failed to clear data, please try again later!');
      setSelectedOptions([]);
      setIsClearing(false);
    }
  }, [dispatch, selectedOptions]);

  return {
    selectedOptions,
    setSelectedOptions,
    isClearing,
    performClearData,
  };
}

/**
 * Settings component giving users a menu to selectively clear sensitive or outdated browser data
 * such as cookies, cache, or history.
 */
export default function ClearBrowserData() {
  const {selectedOptions, setSelectedOptions, isClearing, performClearData} = useClearBrowserData();

  const filterSearchTexts = [
    'Select browser data to clear:',
    'Clear',
    'browser data',
    'cache',
    'cookies',
    'favorites',
    'history',
    'fav icons',
    'clear data',
  ];

  return (
    <SettingsFilterItem searchTexts={filterSearchTexts}>
      <Card>
        <Card.Header>
          <Card.Title>
            <SettingsSearchHighlight text={'Clear Data'} />
          </Card.Title>
          <Card.Description>
            <SettingsSearchHighlight text="Select browser data to clear" />
          </Card.Description>
        </Card.Header>

        <Card.Content className="flex-row justify-between">
          <CheckboxGroup
            variant="secondary"
            value={selectedOptions}
            isDisabled={isClearing}
            onChange={setSelectedOptions}
            className="flex flex-row gap-x-4">
            {BROWSER_DATA_OPTIONS.map(option => (
              <Checkbox className="mt-0" key={option.value} value={option.value}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <SettingsSearchHighlight text={option.label} />
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
          <Button
            variant="danger-soft"
            isPending={isClearing}
            onPress={performClearData}
            isDisabled={isEmpty(selectedOptions)}>
            {isClearing ? <Spinner size="sm" color="current" /> : <BroomIcon />}
            Clear
          </Button>
        </Card.Content>
      </Card>
    </SettingsFilterItem>
  );
}
