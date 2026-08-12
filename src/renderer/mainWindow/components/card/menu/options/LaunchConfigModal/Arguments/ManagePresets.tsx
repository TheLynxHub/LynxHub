import {
  Button,
  ButtonGroup,
  CloseButton,
  FieldError,
  Input,
  Key,
  Label,
  ListBox,
  Popover,
  Select,
  TextField,
} from '@heroui/react';
import {ChosenArgumentsData} from '@lynx_common/types';
import {motion} from 'framer-motion';
import {isEmpty} from 'lodash-es';
import {Dispatch, SetStateAction, useCallback, useMemo, useState} from 'react';

import {convertArrToObject} from '../../../../../../utils';

type Props = {
  presets: string[];
  setChosenArguments: Dispatch<SetStateAction<ChosenArgumentsData>>;
  chosenArguments: ChosenArgumentsData;
};

/**
 * PresetsManager component for managing and switching between multiple presets for arguments.
 * Allows creating new presets, duplicating existing ones, and deleting presets.
 */
export default function PresetsManager({chosenArguments, presets, setChosenArguments}: Props) {
  const [inputValue, setInputValue] = useState<string>('');
  const [createIsOpen, setCreateIsOpen] = useState<boolean>(false);

  // Derive error message directly from input value and existing presets
  const inputErrorMessage = useMemo(() => {
    if (!createIsOpen) return '';
    if (isEmpty(inputValue)) return 'Please enter preset name!';
    if (chosenArguments.data.some(data => data.preset === inputValue)) {
      return 'The chosen name already exists!';
    }
    return '';
  }, [inputValue, chosenArguments.data, createIsOpen]);

  const isInputValid = isEmpty(inputErrorMessage) && !isEmpty(inputValue);

  const deletePreset = useCallback(
    (name: string) => {
      setChosenArguments(prevState => {
        const newData = prevState.data.filter(data => data.preset !== name);
        // If we deleted the active preset, switch to the previous one or the first one
        if (prevState.activePreset === name) {
          const dataIndex = prevState.data.findIndex(data => data.preset === name);
          const newActivePreset = newData[dataIndex === 0 ? 0 : dataIndex - 1]?.preset || '';
          return {activePreset: newActivePreset, data: newData};
        }
        return {...prevState, data: newData};
      });
    },
    [setChosenArguments],
  );

  const changeActivePreset = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      const activePreset = key;
      if (activePreset) {
        setChosenArguments(prevState => ({...prevState, activePreset}));
      }
    },
    [setChosenArguments],
  );

  const handleCreateNew = useCallback(() => {
    if (!isInputValid) return;

    setChosenArguments(prevState => ({
      activePreset: inputValue,
      data: [...prevState.data, {arguments: [], preset: inputValue}],
    }));
    setCreateIsOpen(false);
    setInputValue('');
  }, [inputValue, isInputValid, setChosenArguments]);

  const handleDuplicateExisting = useCallback(() => {
    if (!isInputValid) return;

    setChosenArguments(prevState => {
      const existingArgs = prevState.data.find(data => data.preset === prevState.activePreset)?.arguments || [];
      return {
        activePreset: inputValue,
        data: [...prevState.data, {arguments: existingArgs, preset: inputValue}],
      };
    });
    setCreateIsOpen(false);
    setInputValue('');
  }, [inputValue, isInputValid, setChosenArguments]);

  const sectionItems = useMemo(() => convertArrToObject(presets), [presets]);

  return (
    <motion.div animate={{opacity: 1}} initial={{opacity: 0}} className="flex flex-row space-x-2 items-end">
      {!isEmpty(sectionItems) && (
        <Select
          variant="secondary"
          placeholder="Preset"
          selectionMode="single"
          aria-label="Select Preset"
          allowsEmptyCollection={false}
          onChange={changeActivePreset}
          value={chosenArguments.activePreset}
          fullWidth>
          <Label>Preset:</Label>
          <Select.Trigger>
            <Select.Value>{chosenArguments.activePreset}</Select.Value>
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {sectionItems.map(item => (
                <ListBox.Item id={item.name} key={item.name} textValue={item.name}>
                  <ListBox.ItemIndicator />
                  {item.name}
                  {item.name !== 'Default' && <CloseButton onPress={() => deletePreset(item.name)} />}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      )}
      <Popover
        onOpenChange={isOpen => {
          setCreateIsOpen(isOpen);
          if (!isOpen) setInputValue('');
        }}
        isOpen={createIsOpen}>
        <Button variant="secondary">New</Button>
        <Popover.Content>
          <Popover.Dialog className="gap-y-2 flex flex-col">
            <Popover.Arrow />
            <Popover.Heading>New Preset</Popover.Heading>
            <TextField
              onKeyUp={e => {
                if (e.key === 'Enter') handleCreateNew();
              }}
              value={inputValue}
              spellCheck="false"
              variant="secondary"
              onChange={setInputValue}
              isInvalid={!!inputErrorMessage && !isEmpty(inputValue)}
              fullWidth
              autoFocus>
              <Input placeholder="Preset name..." />
              <FieldError>{inputErrorMessage}</FieldError>
            </TextField>

            <ButtonGroup className="w-full" isDisabled={!isInputValid}>
              <Button size="sm" className="flex-1" onPress={handleCreateNew}>
                Create
              </Button>
              <Button size="sm" className="flex-1" onPress={handleDuplicateExisting}>
                Duplicate
              </Button>
            </ButtonGroup>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </motion.div>
  );
}
