import {Button, InputGroup, Label, ListBox, Select, TextField} from '@heroui/react';
import filesIpc from '@lynx_shared/ipc/files';
import {FileIcon, FolderOpenIcon} from '@solar-icons/react/bold-duotone';
import {isNil} from 'lodash-es';
import {createElement, memo, useCallback, useEffect, useState} from 'react';

import LynxSwitch from '../../../../../LynxSwitch';
import {useInstallStore} from '../store';

/**
 * Displays dynamic input fields defined by the card module or custom extension components.
 */
function UserInputsView() {
  const inputElements = useInstallStore(s => s.userInputElements);
  const extensionElements = useInstallStore(s => s.extensionUserInput);
  const updateResult = useInstallStore(s => s.updateUserElementResult);

  const [selectedPaths, setSelectedPaths] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const selectPath = useCallback(
    (type: 'folder' | 'file', id: string, isRequired?: boolean) => {
      const properties: ('openDirectory' | 'openFile')[] = type === 'folder' ? ['openDirectory'] : ['openFile'];

      filesIpc
        .openDlg({properties})
        .then(result => {
          if (result) {
            setSelectedPaths(prev => ({...prev, [id]: result}));
            updateResult(id, result);
            if (isRequired) {
              setErrors(prev => ({...prev, [id]: false}));
            }
          } else if (isRequired && !selectedPaths[id]) {
            setErrors(prev => ({...prev, [id]: true}));
          }
        })
        .catch(err => {
          console.error('Failed to open file dialog:', err);
        });
    },
    [updateResult, selectedPaths],
  );

  useEffect(() => {
    inputElements.elements.forEach(element => {
      const {defaultValue, id, type} = element;
      if (!isNil(defaultValue)) {
        switch (type) {
          case 'checkbox':
            if (typeof defaultValue === 'boolean') updateResult(id, defaultValue);
            break;
          case 'text-input':
          case 'select':
          case 'directory':
          case 'file':
            if (typeof defaultValue === 'string') {
              updateResult(id, defaultValue);
              setSelectedPaths(prev => ({...prev, [id]: defaultValue}));
            }
            break;
        }
      }
    });
  }, [inputElements.elements, updateResult]);

  return (
    <div className="mb-6 mt-4 flex flex-col items-center justify-center gap-y-4 px-2">
      <span className="text-large font-semibold">
        {inputElements.title || 'Please fill in the required information and click Next'}
      </span>
      {inputElements.elements.map(element => {
        const {defaultValue, id, isRequired, label, selectOptions, type} = element;
        const hasError = errors[id] || false;
        const currentPath =
          selectedPaths[id] || (type === 'directory' ? 'Click here to select folder' : 'Click here to select file');

        switch (type) {
          case 'checkbox':
            return (
              <LynxSwitch
                key={id}
                title={label}
                variant="secondary"
                enabled={!!defaultValue}
                onEnabledChange={value => updateResult(id, value)}
              />
            );
          case 'text-input':
            return (
              <TextField
                key={id}
                variant="secondary"
                isRequired={isRequired}
                onChange={value => updateResult(id, value)}
                defaultValue={defaultValue as string | undefined}
                fullWidth>
                <Label>{label}</Label>
                <InputGroup>
                  <InputGroup.Input />
                </InputGroup>
              </TextField>
            );
          case 'select':
            return (
              <Select
                onChange={key => {
                  if (key) updateResult(id, key.toString());
                }}
                key={id}
                variant="secondary"
                isRequired={isRequired}
                defaultValue={defaultValue ? (defaultValue as string) : undefined}
                fullWidth>
                <Label>{label}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {selectOptions?.map(option => (
                      <ListBox.Item id={option} key={option} textValue={option}>
                        {option}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            );
          case 'directory':
            return (
              <div key={id} className="flex w-full flex-col gap-y-2">
                <Label className={`text-sm ${isRequired ? 'after:ml-1 after:text-danger after:content-["*"]' : ''}`}>
                  {label}
                </Label>
                <Button
                  variant="secondary"
                  onPress={() => selectPath('folder', id, isRequired)}
                  className={`justify-start text-foreground ${hasError ? 'border-2 border-danger' : ''}`}
                  fullWidth>
                  <FolderOpenIcon />
                  <span className={hasError && !selectedPaths[id] ? 'text-danger' : ''}>{currentPath}</span>
                </Button>
                {hasError && <span className="text-xs text-danger">{label} is required. Please select a folder.</span>}
              </div>
            );
          case 'file':
            return (
              <div key={id} className="flex w-full flex-col gap-y-2">
                <Label className={`text-sm ${isRequired ? 'after:ml-1 after:text-danger after:content-["*"]' : ''}`}>
                  {label}
                </Label>
                <Button
                  variant="secondary"
                  onPress={() => selectPath('file', id, isRequired)}
                  className={`justify-start text-foreground ${hasError ? 'border-2 border-danger' : ''}`}
                  fullWidth>
                  <FileIcon />
                  <span className={hasError && !selectedPaths[id] ? 'text-danger' : ''}>{currentPath}</span>
                </Button>
                {hasError && <span className="text-xs text-danger">{label} is required. Please select a file.</span>}
              </div>
            );
        }
      })}

      {extensionElements?.map((elem, index) => createElement(elem, {key: `${index}_extension_userInputElement`}))}
    </div>
  );
}

export default memo(UserInputsView);
