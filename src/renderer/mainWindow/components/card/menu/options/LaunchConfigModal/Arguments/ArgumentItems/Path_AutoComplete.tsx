import {Autocomplete, Description, EmptyState, Key, Label, ListBox, SearchField} from '@heroui/react';
import {FolderListData} from '@lynx_common/types';
import {replaceSlashes} from '@lynx_common/utils';
import filesIpc from '@lynx_shared/ipc/files';
import {FileIcon, FolderIcon} from '@solar-icons/react/bold-duotone';
import Fuse from 'fuse.js';
import {useEffect, useState} from 'react';

type Props = {
  /** The base directory to start relative paths from */
  baseDir: string;
  /** Whether to look for files or folders */
  type?: 'folder' | 'file';
  /** Callback when the value changes */
  onValueChange?: (value: string | undefined) => void;
  /** Initial value */
  defaultValue?: string;
};

/**
 * Autocomplete component for file system paths.
 * Lists files and directories relative to a base directory.
 */
export default function PathAutoComplete({baseDir, onValueChange, defaultValue = './', type = 'file'}: Props) {
  const [inputValue, setInputValue] = useState<string>(defaultValue);
  const [data, setData] = useState<FolderListData[]>([]);
  const [searchData, setSearchData] = useState<FolderListData[]>([]);

  // Fetch directory contents based on current input path
  useEffect(() => {
    if (inputValue.startsWith('.') || inputValue.startsWith('/')) {
      const relatives = inputValue.split('/');
      // Remove the last segment to get the directory to list
      relatives.pop();

      filesIpc
        .listDir(baseDir, relatives)
        .then((result: FolderListData[]) => {
          let filteredResult = result;
          if (type === 'folder') {
            filteredResult = result.filter(dir => dir.type === 'folder');
          }
          setData(filteredResult);

          // Also update search data immediately if we just loaded a new dir
          // This logic might need refinement to filter based on the current last segment
          const lastSegment = inputValue.split('/').pop() || '';
          if (lastSegment) {
            const fuse = new Fuse(filteredResult, {
              keys: ['name'],
              threshold: 0.4,
            });
            setSearchData(fuse.search(lastSegment).map(r => r.item));
          } else {
            setSearchData(filteredResult);
          }
        })
        .catch(error => {
          console.error('Failed to list directory:', error);
        });
    }
  }, [inputValue, baseDir, type]);

  // Sync state with prop if it changes
  useEffect(() => {
    if (defaultValue !== undefined && defaultValue !== inputValue) {
      setInputValue(defaultValue);
    }
  }, [defaultValue]);

  const handleInputChange = (value: string) => {
    const targetValue = replaceSlashes(value);

    setInputValue(targetValue);
    onValueChange?.(targetValue);

    if (targetValue === '') {
      setSearchData([]);
      return;
    }

    // Filter existing data for immediate feedback
    const segments = targetValue.split('/');
    const lastSegment = segments[segments.length - 1];

    if (!lastSegment) {
      setSearchData(data);
    } else {
      const fuse = new Fuse(data, {
        keys: ['name'],
        threshold: 0.4,
      });
      setSearchData(fuse.search(lastSegment).map(r => r.item));
    }
  };

  const onSelectionChange = (key: Key | null) => {
    if (!key || typeof key === 'number') return;

    let currentSelection = key;
    currentSelection = replaceSlashes(currentSelection);
    if (!currentSelection.endsWith('/')) {
      currentSelection = currentSelection + '/';
    }

    setInputValue(prev => {
      const segments = prev.split('/');
      segments[segments.length - 1] = currentSelection;
      const newValue = segments.join('/');

      // Defer the callback to avoid side effects in render/state update cycle
      setTimeout(() => onValueChange?.(newValue), 0);
      return newValue;
    });
  };

  return (
    <Autocomplete
      variant="secondary"
      shouldCloseOnSelect={false}
      onChange={onSelectionChange}
      aria-label="Relative Path Autocomplete">
      <Label />
      <Autocomplete.Trigger>
        <Autocomplete.Value className="text-xs text-foreground place-content-center">{inputValue}</Autocomplete.Value>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Description />
      <Autocomplete.Popover>
        <Autocomplete.Filter>
          <SearchField
            value={inputValue}
            variant="secondary"
            aria-label="Search for path"
            onChange={handleInputChange}
            autoFocus>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            {searchData.map(item => (
              <ListBox.Item id={item.name} key={item.name} textValue={item.name}>
                {item.type === 'folder' ? <FolderIcon className="size-4" /> : <FileIcon className="size-4" />}
                <Label>{item.name}</Label>
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
