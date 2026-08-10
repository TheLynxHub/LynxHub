import {
  Button,
  Chip,
  CloseButton,
  Description,
  Input,
  Key,
  Label,
  ListBox,
  NumberField,
  Select,
  Separator,
  TextArea,
} from '@heroui/react';
import {CustomArg} from '@lynx_common/types';
import {ArgumentType} from '@lynx_common/types/plugins/modules';
import filesIpc from '@lynx_shared/ipc/files';
import {
  CloseCircleIcon,
  HomeAddIcon,
  NotesIcon,
  Pen2Icon,
  SettingsMinimalisticIcon,
  TrashBin2Icon,
} from '@solar-icons/react/bold-duotone';
import {CheckReadIcon, UnreadIcon} from '@solar-icons/react/linear';
import {AnimatePresence, motion} from 'framer-motion';
import {Dispatch, ReactNode, SetStateAction} from 'react';

type AnimProp = {
  children: ReactNode;
  show: boolean;
};

function AnimateChild({show, children}: AnimProp) {
  return (
    <AnimatePresence mode="popLayout">
      {show && (
        <motion.div
          exit={{translateY: 5, opacity: 0, scale: 0.7}}
          animate={{translateY: 0, opacity: 1, scale: 1}}
          initial={{translateY: 5, opacity: 0, scale: 0.7}}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type RenderProps = {
  item: CustomArg;
  isAdded: boolean;
  setCustomList: Dispatch<SetStateAction<CustomArg[]>>;
  addItem: (item: CustomArg) => void;
  removeItem: (item: CustomArg) => void;
};

const itemTypes: {id: string; label: string; description: string}[] = [
  {
    label: 'Text Input',
    id: 'Input',
    description: 'Text input field for free-form text entries',
  },
  {
    label: 'Number',
    id: 'Number',
    description: 'Input field for numeric values only',
  },
  {
    label: 'Folder',
    id: 'Directory',
    description: 'Select a folder from the system',
  },
  {
    label: 'File',
    id: 'File',
    description: 'Select a file from the system',
  },
  {
    label: 'Boolean',
    id: 'CheckBox',
    description: 'Value that is either present (enabled) or absent (disabled)',
  },
  {
    label: 'Select',
    id: 'DropDown',
    description: 'Select from a predefined list of values',
  },
];

export default function RenderCustomItem({item, isAdded, setCustomList, addItem, removeItem}: RenderProps) {
  const onNameChange = (value: string) => {
    setCustomList(prevState =>
      prevState.map(listItem => {
        return listItem.name !== item.name ? listItem : {...listItem, name: value};
      }),
    );
  };

  const onDefaultValueChange = (value: any) => {
    setCustomList(prevState =>
      prevState.map(listItem => {
        return listItem.name !== item.name ? listItem : {...listItem, defaultValue: value};
      }),
    );
  };

  const onTypeChange = (key: Key | null) => {
    if (!key || typeof key === 'number') return;

    const targetKey = key as ArgumentType;
    setCustomList(prevState =>
      prevState.map(listItem => (listItem.name === item.name ? {...listItem, type: targetKey} : listItem)),
    );
  };

  const selectFolder = () => {
    filesIpc.openDlg({properties: ['openDirectory']}).then(selectedPath => {
      if (selectedPath) onDefaultValueChange(selectedPath);
    });
  };

  const selectFile = () => {
    filesIpc.openDlg({properties: ['openFile']}).then(selectedPath => {
      if (selectedPath) onDefaultValueChange(selectedPath);
    });
  };

  const clearDefaultValue = () => onDefaultValueChange(undefined);

  switch (item.kind) {
    case 'envVar':
    case 'commandLine':
      return (
        <motion.div
          animate={{translateY: 0, opacity: 1, scale: 1}}
          initial={{translateY: 5, opacity: 0, scale: 0.9}}
          className="text-sm bg-surface flex flex-col px-4 py-3 rounded-xl gap-y-2"
          layout>
          <div className="flex justify-between items-center">
            <div
              className={
                `flex items-center gap-x-2 font-semibold ` +
                `${item.kind === 'envVar' ? 'text-accent' : 'text-LynxPurple/70'}`
              }>
              {item.kind === 'envVar' ? <HomeAddIcon /> : <SettingsMinimalisticIcon />}
              <span>{item.kind === 'envVar' ? 'Environment Variable' : 'Command Line'}</span>
            </div>
            <div className="flex items-center gap-x-1">
              <AnimateChild show={isAdded}>
                <Button size="sm" variant="ghost" className="text-success" isDisabled isIconOnly>
                  <CheckReadIcon className="size-4.5" />
                </Button>
              </AnimateChild>
              <AnimateChild show={!isAdded}>
                <Button size="sm" variant="secondary" onPress={() => addItem(item)} isIconOnly>
                  <UnreadIcon className="size-4.5" />
                </Button>
              </AnimateChild>

              <Button size="sm" variant="danger-soft" onPress={() => removeItem(item)} isIconOnly>
                <TrashBin2Icon className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-x-4">
            <div className="flex items-center gap-x-2">
              <span className="shrink-0">Name:</span>
              <Input value={item.name} variant="secondary" onChange={e => onNameChange(e.target.value)} />
            </div>

            <Separator className="my-3" orientation="vertical" />

            <div className="flex items-center gap-x-2 flex-1">
              <Select
                value={item.type}
                variant="secondary"
                onChange={onTypeChange}
                className="flex-row items-center"
                aria-label="Select the argument type"
                placeholder="Choose how this argument will be processed"
                fullWidth>
                <Label>Type:</Label>
                <Select.Trigger>
                  <Select.Value>{itemTypes.find(it => it.id === item.type)?.label}</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {itemTypes.map(item => (
                      <ListBox.Item id={item.id} key={item.id} textValue={item.label}>
                        <div className="flex flex-col">
                          <Label>{item.label}</Label>
                          <Description>{item.description}</Description>
                        </div>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-x-2">
            {item.type === 'Input' && (
              <>
                <span className="shrink-0">Default Value:</span>
                <Input
                  spellCheck="false"
                  variant="secondary"
                  placeholder="Enter defualt value..."
                  onChange={e => onDefaultValueChange(e.target.value)}
                  value={typeof item.defaultValue !== 'string' ? '' : item.defaultValue}
                  fullWidth
                />
              </>
            )}
            {item.type === 'Number' && (
              <>
                <span className="shrink-0">Default Value:</span>
                <NumberField
                  variant="secondary"
                  aria-label="Number value"
                  onChange={onDefaultValueChange}
                  value={typeof item.defaultValue === 'string' ? 0 : item.defaultValue}
                  fullWidth>
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                </NumberField>
              </>
            )}
            {item.type === 'Directory' && (
              <>
                <span className="shrink-0">Folder:</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={selectFolder}
                  className={`justify-between ${item.defaultValue && 'text-foreground'}`}
                  fullWidth>
                  {item.defaultValue || 'Press to set default folder...'}
                  {item.defaultValue && (
                    <Button size="sm" variant="ghost" className="size-6" onPress={clearDefaultValue} isIconOnly>
                      <CloseCircleIcon className="size-4" />
                    </Button>
                  )}
                </Button>
              </>
            )}
            {item.type === 'File' && (
              <>
                <span className="shrink-0">Folder:</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={selectFile}
                  className={`justify-between ${item.defaultValue && 'text-foreground'}`}
                  fullWidth>
                  {item.defaultValue || 'Press to set default file...'}
                  {item.defaultValue && (
                    <Button size="sm" variant="ghost" className="size-6" onPress={clearDefaultValue} isIconOnly>
                      <CloseCircleIcon className="size-4" />
                    </Button>
                  )}
                </Button>
              </>
            )}
            {item.type === 'DropDown' && (
              <div className="flex flex-col w-full gap-y-2">
                <div className="flex items-center gap-x-2 w-full">
                  <span className="shrink-0">Default Values:</span>
                  <Input
                    spellCheck="false"
                    variant="secondary"
                    onChange={e => onDefaultValueChange(e.target.value)}
                    placeholder="Enter values comma separated (value1, value2)"
                    value={typeof item.defaultValue !== 'string' ? '' : item.defaultValue}
                    fullWidth
                  />
                </div>
                {item.defaultValue && (
                  <div className="flex items-center gap-x-2">
                    {typeof item.defaultValue === 'string' &&
                      item.defaultValue.split(',').map(value => {
                        const targetValue = value.trim();

                        if (!targetValue) return null;

                        const removeValue = () => {
                          const removedResult = (item.defaultValue as string)
                            .split(',')
                            .filter(v => v !== value)
                            .map(v => v.trim());
                          onDefaultValueChange(removedResult.join(', '));
                        };

                        return (
                          <Chip size="sm" key={value} variant="soft" color="success">
                            <Chip.Label>{targetValue}</Chip.Label>
                            <CloseButton className="scale-70" onPress={removeValue} />
                          </Chip>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      );
    case 'custom':
    case 'comment':
    default:
      return (
        <motion.div
          animate={{translateY: 0, opacity: 1, scale: 1}}
          initial={{translateY: 5, opacity: 0, scale: 0.9}}
          className="text-sm bg-surface flex flex-col px-4 py-3 rounded-xl gap-y-2"
          layout>
          <div className="flex justify-between items-center">
            <div
              className={
                `flex items-center gap-x-2 font-semibold ` +
                `${item.kind === 'comment' ? 'text-warning-soft-foreground' : 'text-success-soft-foreground'}`
              }>
              {item.kind === 'comment' ? <Pen2Icon /> : <NotesIcon />}
              <span>{item.kind === 'comment' ? 'Comment' : 'Custom'}</span>
            </div>
            <div className="flex items-center gap-x-1">
              <AnimateChild show={isAdded}>
                <Button size="sm" variant="ghost" className="text-success" isDisabled isIconOnly>
                  <CheckReadIcon className="size-4.5" />
                </Button>
              </AnimateChild>
              <AnimateChild show={!isAdded}>
                <Button size="sm" variant="secondary" onPress={() => addItem(item)} isIconOnly>
                  <UnreadIcon className="size-4.5" />
                </Button>
              </AnimateChild>

              <Button size="sm" variant="danger-soft" onPress={() => removeItem(item)} isIconOnly>
                <TrashBin2Icon className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-x-4 size-full">
            <div className="flex items-center gap-x-2">
              <span className="shrink-0">Name:</span>
              <Input value={item.name} variant="secondary" onChange={e => onNameChange(e.target.value)} />
            </div>
            <div className="flex items-center gap-x-2 flex-1">
              <span className="shrink-0">{item.kind === 'comment' ? 'Comment Text' : 'Custom Data'}:</span>
              {item.kind === 'comment' ? (
                <Input
                  spellCheck="false"
                  variant="secondary"
                  value={item.defaultValue}
                  placeholder="Enter defualt value..."
                  onChange={e => onDefaultValueChange(e.target.value)}
                  fullWidth
                />
              ) : (
                <TextArea
                  className="h-20"
                  spellCheck="false"
                  variant="secondary"
                  value={item.defaultValue}
                  placeholder="Enter defualt value..."
                  onChange={e => onDefaultValueChange(e.target.value)}
                  fullWidth
                />
              )}
            </div>
          </div>
        </motion.div>
      );
  }
}
