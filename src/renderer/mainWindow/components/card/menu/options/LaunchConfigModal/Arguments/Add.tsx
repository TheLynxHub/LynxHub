import {Button, Chip, Dropdown, Label, Modal, ScrollShadow, SearchField, Tabs, useOverlayState} from '@heroui/react';
import {ChosenArgumentsData, CustomArg} from '@lynx_common/types';
import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import {BroomIcon, FilterIcon, MonitorIcon, WindowFrameIcon} from '@solar-icons/react/bold-duotone';
import {ImportIcon} from '@solar-icons/react/line-duotone';
import {isEmpty, some} from 'lodash-es';
import {Plus} from 'lucide-react';
import {Dispatch, Key, SetStateAction, useCallback, useEffect, useMemo, useState} from 'react';

import {useSupportCustomArg} from '../../../../../../plugins/modules';
import {useGetArgumentsByID} from '../../../../../../plugins/modules';
import {getArgumentDefaultValue, getFilteredArguments} from '../../../../../../utils/moduleArguments';
import TabModal from '../../../../../TabModal';
import ArgumentSelectionList from './AddCategory';
import CustomArguments from './CustomArguments';

type Props = {
  addArgumentsModal: ReturnType<typeof useOverlayState>;
  importArgumentsModal?: ReturnType<typeof useOverlayState>;
  chosenArguments: ChosenArgumentsData;
  setChosenArguments: Dispatch<SetStateAction<ChosenArgumentsData>>;
  id: string;
};

const isEmptyData = (data: any): boolean => {
  if (!data) return true;
  if ('sections' in data) {
    return data.sections.every((section: any) => section.items.length === 0);
  } else if ('items' in data) {
    return data.items.length === 0;
  }
  return true;
};

/**
 * Modal to select and add new arguments to the configuration.
 */
export default function AddArgumentModal({
  addArgumentsModal,
  importArgumentsModal,
  chosenArguments,
  setChosenArguments,
  id,
}: Props) {
  const [filterArguments, setFilterArguments] = useState<Set<string>>(new Set(['all']));
  const [selectedArguments, setSelectedArguments] = useState<Set<string>>(new Set([]));
  const [searchValue, setSearchValue] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<Key>('module');

  const [customArgs, setCustomArgs] = useState<CustomArg[]>([]);

  const cardArgument = useGetArgumentsByID(id);

  useEffect(() => {
    setSelectedArguments(prevState => {
      const newSet = new Set(prevState);
      customArgs.forEach(item => newSet.add(item.name));
      return newSet;
    });
  }, [customArgs]);

  const currentArgNames = useMemo(
    () =>
      chosenArguments.data.find(data => data.preset === chosenArguments.activePreset)?.arguments.map(arg => arg.name) ||
      [],
    [chosenArguments],
  );

  // Memoize the filtered list of available arguments
  const listData = useMemo(() => {
    return getFilteredArguments(cardArgument, currentArgNames);
  }, [currentArgNames, cardArgument]);

  const removeSelected = useCallback((value: string) => {
    setSelectedArguments(prevState => {
      const newSet = new Set(prevState);
      newSet.delete(value);
      return newSet;
    });
    setCustomArgs(prev => prev.filter(item => item.name !== value));
  }, []);

  const clearSelected = useCallback(() => {
    setSelectedArguments(new Set([]));
    setCustomArgs([]);
  }, []);

  const onClose = useCallback(() => {
    setSearchValue('');
    clearSelected();
    addArgumentsModal.close();
  }, [clearSelected, addArgumentsModal]);

  const openImport = useCallback(() => {
    onClose();
    importArgumentsModal?.open();
  }, [onClose, importArgumentsModal]);

  const onAdd = useCallback(() => {
    if (selectedArguments.size === 0) return;

    setChosenArguments(prevState => {
      const activePresetData = prevState.data.find(data => data.preset === prevState.activePreset);
      if (!activePresetData) return prevState;

      const currentArgs = activePresetData.arguments;

      const filterSelected = Array.from(selectedArguments).filter(item => !customArgs.some(ar => ar.name === item));

      const newArgsToAdd = filterSelected.filter(
        argName => !currentArgs.some(existingArg => existingArg.name === argName),
      );

      const newChosenArgs: ChosenArgument[] = newArgsToAdd.map(argName => ({
        name: argName,
        value: getArgumentDefaultValue(argName, cardArgument) || '',
      }));

      newChosenArgs.push(
        ...customArgs.map(item => {
          if (item.type === 'CheckBox') {
            return {
              name: item.name,
              value: typeof item.defaultValue === 'boolean' ? item.defaultValue : true,
              custom: {kind: item.kind, type: item.type},
            };
          }
          if (item.type === 'DropDown') {
            const parsedValues =
              Array.isArray(item.values) && item.values.length > 0
                ? item.values
                : typeof item.defaultValue === 'string'
                  ? item.defaultValue
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean)
                  : [];
            return {
              name: item.name,
              value: parsedValues[0] ?? item.defaultValue ?? '',
              custom: {kind: item.kind, type: item.type, values: parsedValues},
            };
          }
          return {
            name: item.name,
            value: item.defaultValue ?? '',
            custom: {kind: item.kind, type: item.type},
          };
        }),
      );

      const newData = prevState.data.map(presetData => {
        if (presetData.preset === prevState.activePreset) {
          return {
            ...presetData,
            arguments: [...presetData.arguments, ...newChosenArgs],
          };
        }
        return presetData;
      });

      return {...prevState, data: newData};
    });

    onClose();
  }, [selectedArguments, cardArgument, onClose, setChosenArguments, customArgs]);

  const supportCustomArg = useSupportCustomArg(id);

  return (
    <TabModal
      onOpenChange={value => {
        if (value) {
          addArgumentsModal.open();
        } else {
          onClose();
        }
      }}
      backdropVariant="transparent"
      isOpen={addArgumentsModal.isOpen}>
      <Modal.CloseTrigger />
      <Modal.Header className="flex flex-col gap-y-2">
        <div className="flex w-full flex-row space-x-2 items-center">
          <div className="flex flex-row items-center space-x-2">
            <span className="font-bold">Add Argument</span>
            {!isEmpty(selectedArguments) && (
              <Button size="sm" className="text-xs" variant="danger-soft" onPress={clearSelected}>
                <BroomIcon />
                Clear All
              </Button>
            )}
          </div>
          {importArgumentsModal && (
            <Button size="sm" variant="tertiary" className="text-xs" onPress={openImport}>
              <ImportIcon />
              Import Text
            </Button>
          )}
        </div>
        {!isEmpty(selectedArguments) && (
          <div className={'flex w-full flex-row flex-wrap gap-1 px-2 py-0.5 max-h-15 overflow-y-auto scrollbar-hide'}>
            {Array.from(selectedArguments).map((value: string) => (
              <Chip
                size="sm"
                key={value}
                variant="soft"
                color="success"
                onClick={() => removeSelected(value)}
                className="hover:bg-success-soft-hover cursor-pointer">
                {value}
              </Chip>
            ))}
          </div>
        )}
        <div className="flex w-full flex-row gap-x-2">
          <SearchField
            spellCheck="false"
            variant="secondary"
            value={searchValue}
            onChange={setSearchValue}
            fullWidth
            autoFocus>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search by name or description..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <Dropdown>
            <Button variant="tertiary" isIconOnly>
              <FilterIcon />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                onSelectionChange={keys => {
                  setFilterArguments(keys as Set<string>);
                }}
                selectionMode="single"
                shouldCloseOnSelect={false}
                selectedKeys={filterArguments}
                disallowEmptySelection>
                <Dropdown.Item id="all" textValue="All">
                  <Dropdown.ItemIndicator />
                  <Label>All</Label>
                </Dropdown.Item>
                <Dropdown.Item id="selected" textValue="Selected">
                  <Dropdown.ItemIndicator />
                  <Label>Selected</Label>
                </Dropdown.Item>
                <Dropdown.Item id="notSelected" textValue="Not Selected">
                  <Dropdown.ItemIndicator />
                  <Label>Not Selected</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        {supportCustomArg && (
          <Tabs className="w-full my-2 px-4" onSelectionChange={setCurrentTab} selectedKey={currentTab.toString()}>
            <Tabs.ListContainer>
              <Tabs.List aria-label="Options">
                <Tabs.Tab id="module" className="gap-x-1">
                  <WindowFrameIcon className="size-4" />
                  Module Provided
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="custom" className="gap-x-1">
                  <MonitorIcon className="size-4" />
                  Custom
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        )}
      </Modal.Header>
      <Modal.Body className="pl-2">
        <ScrollShadow className="pr-2">
          {currentTab === 'module' && (
            <div className="space-y-2">
              {listData?.map((data, index) => {
                if (isEmptyData(data)) return null;
                // Check if the category condition is met (if any)
                if (
                  data.condition &&
                  !selectedArguments.has(data.condition) &&
                  !some(chosenArguments.data.find(d => d.preset === chosenArguments.activePreset)?.arguments, {
                    name: data.condition,
                  })
                ) {
                  return null;
                }
                return (
                  <ArgumentSelectionList
                    title={data.category}
                    searchValue={searchValue}
                    key={`${index}_category`}
                    filterArguments={filterArguments}
                    selectedArguments={selectedArguments}
                    setSelectedArguments={setSelectedArguments}
                    listData={'sections' in data ? data.sections : data.items}
                  />
                );
              })}
            </div>
          )}
          {currentTab === 'custom' && (
            <CustomArguments
              id={id}
              currentArgs={currentArgNames}
              setCustomArgs={setCustomArgs}
              selectedArguments={selectedArguments}
            />
          )}
        </ScrollShadow>
      </Modal.Body>
      <Modal.Footer>
        <Button onPress={onAdd} isDisabled={isEmpty(selectedArguments)}>
          <Plus className="size-4" />
          Add
        </Button>
      </Modal.Footer>
    </TabModal>
  );
}
