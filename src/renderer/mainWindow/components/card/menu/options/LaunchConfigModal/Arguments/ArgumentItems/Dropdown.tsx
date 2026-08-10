import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {ArgumentDropdownValues, ChosenArgument} from '@lynx_common/types/plugins/modules';
import {isStringArray} from '@lynx_common/utils';
import {ListDownMinimalisticIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {useGetArgumentsByID} from '../../../../../../../plugins/modules';
import {getArgumentDefaultValue, getArgumentValues} from '../../../../../../../utils/moduleArguments';
import ArgumentItemBase from './Base';

type Props = {
  /** The argument data */
  argument: ChosenArgument;
  /** Function to remove the argument */
  removeArg: () => void;
  /** Function to change the argument value */
  changeValue: (value: any) => void;
  /** The ID of the card */
  id: string;
};

/**
 * Renders a Dropdown argument item using a Select component.
 * Allows selecting a single value from a predefined list.
 *
 * @returns The rendered DropdownArgItem component.
 */
export default function DropdownArgItem({argument, changeValue, removeArg, id}: Props) {
  const cardArgument = useGetArgumentsByID(id);

  const defaultValue = useMemo(
    () => getArgumentDefaultValue(argument.name, cardArgument),
    [argument.name, cardArgument],
  );

  const [selectedKey, setSelectedKey] = useState<Key | null>(
    argument.value ? argument.value : defaultValue ? defaultValue : null,
  );

  // Sync state with prop updates
  useEffect(() => {
    if (argument.value) {
      setSelectedKey(argument.value);
    } else if (defaultValue) {
      setSelectedKey(defaultValue);
    }
  }, [argument.value, defaultValue]);

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      setSelectedKey(key);
      changeValue(key);
    },
    [changeValue],
  );

  const items: ArgumentDropdownValues = useMemo(() => {
    const values = getArgumentValues(argument.name, cardArgument) || [];
    if (isStringArray(values)) {
      return values.map(value => ({value, description: undefined}));
    }

    return values as ArgumentDropdownValues;
  }, [argument.name, cardArgument]);

  return (
    <ArgumentItemBase
      id={id}
      name={argument.name}
      removeArg={removeArg}
      icon={<ListDownMinimalisticIcon className="size-4.5" />}>
      <Select
        variant="secondary"
        value={selectedKey}
        onChange={onChange}
        aria-label="Select an item"
        placeholder="Select an item">
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {items.map(item => (
              <ListBox.Item id={item.value} key={item.value} textValue={item.value}>
                <ListBox.ItemIndicator />
                <div className="flex flex-col">
                  <Label>{item.value}</Label>
                  <Description>{item.description}</Description>
                </div>
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </ArgumentItemBase>
  );
}
