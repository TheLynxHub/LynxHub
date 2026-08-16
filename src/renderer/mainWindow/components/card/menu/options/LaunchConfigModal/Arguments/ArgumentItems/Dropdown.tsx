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

  const items: ArgumentDropdownValues = useMemo(() => {
    if (argument.custom?.values && Array.isArray(argument.custom.values) && argument.custom.values.length > 0) {
      return argument.custom.values.map(value => ({value, description: undefined}));
    }

    if (typeof argument.value === 'string' && argument.value.includes(',')) {
      const splitValues = argument.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (splitValues.length > 1) {
        return splitValues.map(value => ({value, description: undefined}));
      }
    }

    const values = getArgumentValues(argument.name, cardArgument) || [];
    if (isStringArray(values)) {
      return values.map(value => ({value, description: undefined}));
    }

    return values as ArgumentDropdownValues;
  }, [argument.name, argument.custom, argument.value, cardArgument]);

  const defaultValue = useMemo(() => {
    if (argument.custom) {
      return items[0]?.value ?? '';
    }
    return getArgumentDefaultValue(argument.name, cardArgument);
  }, [argument.custom, argument.name, cardArgument, items]);

  const resolveSelectedKey = useCallback(
    (rawVal: any) => {
      if (rawVal) {
        if (typeof rawVal === 'string' && rawVal.includes(',')) {
          return items[0]?.value ?? rawVal;
        }
        return rawVal;
      }
      return defaultValue ? defaultValue : (items[0]?.value ?? null);
    },
    [defaultValue, items],
  );

  const [selectedKey, setSelectedKey] = useState<Key | null>(resolveSelectedKey(argument.value));

  // Sync state with prop updates
  useEffect(() => {
    const val = resolveSelectedKey(argument.value);
    setSelectedKey(val);

    if (items.length > 0 && typeof argument.value === 'string' && argument.value.includes(',')) {
      changeValue(items[0].value);
    }
  }, [argument.value, changeValue, items, resolveSelectedKey]);

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      setSelectedKey(key);
      changeValue(key);
    },
    [changeValue],
  );

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
