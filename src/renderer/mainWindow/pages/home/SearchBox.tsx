import {Description, Kbd, SearchField} from '@heroui/react';
import {formatWebAddress, isSearchQuery} from '@lynx_common/utils';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {Dispatch, memo, SetStateAction, useCallback, useMemo} from 'react';

/**
 * Props for the HomeSearchBox component.
 */
interface HomeSearchBoxProps {
  /** The current value of the search input field. */
  searchValue: string;
  /** State dispatcher function for updating the search string. */
  setSearchValue: Dispatch<SetStateAction<string>>;
}

/**
 * Provide a lightweight UI input component for filtering and searching specific interface cards on the Home view.
 * Pressing Enter opens a new browser tab with Google search or the specified URL.
 *
 * @param {HomeSearchBoxProps} props The current search state and its mutation dispatch.
 * @returns {JSX.Element} The search input element.
 */
const HomeSearchBox = memo(({searchValue, setSearchValue}: HomeSearchBoxProps) => {
  const trimmedValue = useMemo(() => searchValue.trim(), [searchValue]);

  const isUrl = useMemo(() => {
    if (!trimmedValue) return false;
    return !isSearchQuery(trimmedValue);
  }, [trimmedValue]);

  const handleSubmit = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const url = formatWebAddress(trimmed, true);
    contextMenuIpc.send.rightClickItems.newTab(url);

    setSearchValue('');
  }, []);

  return (
    <SearchField
      variant="secondary"
      value={searchValue}
      onSubmit={handleSubmit}
      onChange={setSearchValue}
      aria-label="Search interfaces"
      fullWidth>
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input spellCheck="false" placeholder="Search interfaces..." />
        <SearchField.ClearButton />
      </SearchField.Group>
      {trimmedValue && (
        <Description className="mt-1 text-xs text-muted">
          Press <Kbd className="text-xs px-1 h-5">Enter</Kbd> to
          {isUrl ? ' open link in browser' : ' search Google in browser'}
        </Description>
      )}
    </SearchField>
  );
});

export default HomeSearchBox;
