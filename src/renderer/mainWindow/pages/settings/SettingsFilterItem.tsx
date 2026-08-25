import {useSettingsState} from '@lynx/redux/reducers/settings';
import {searchInStrings} from '@lynx/utils';
import {memo, PropsWithChildren} from 'react';

/** Props for SettingsFilterItem component */
export type SettingsFilterItemProps = PropsWithChildren<{
  /** Array of strings that define the searchable content for this settings item */
  searchTexts: (string | undefined)[];
}>;

/**
 * Helper to determine if a settings item falls within the parameter of the search string.
 * This is widely used across individual inner card setups.
 */
export function canSettingItemShow(searchValue: string, searchTexts: (string | undefined)[]) {
  if (!searchValue) return true;
  return searchInStrings(searchValue, searchTexts);
}

/**
 * Renders the children if the parent active search value matches local component text.
 * Skips rendering the nodes completely if the search omits it.
 */
const SettingsFilterItem = ({searchTexts, children}: SettingsFilterItemProps) => {
  const searchValue = useSettingsState('searchValue');

  // Directly calculate visibility avoiding unnecessary memoization
  const visible = canSettingItemShow(searchValue, searchTexts);

  if (!visible) {
    return null;
  }

  return <div className="contents">{children}</div>;
};

export default memo(SettingsFilterItem);
