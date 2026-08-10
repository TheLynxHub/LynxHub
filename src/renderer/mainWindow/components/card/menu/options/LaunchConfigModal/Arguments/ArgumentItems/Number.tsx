import {NumberField} from '@heroui/react';
import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import {TextFormatIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {useGetArgumentsByID} from '../../../../../../../plugins/modules';
import {getArgumentDefaultValue, getArgumentNumberConfig} from '../../../../../../../utils/moduleArguments';
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
 * Renders an Input argument item for free-form text entry.
 * Updates the value on blur to minimize re-renders in parent.
 */
export default function NumberArgItem({argument, changeValue, removeArg, id}: Props) {
  const cardArgument = useGetArgumentsByID(id);

  const [inputValue, setInputValue] = useState<number>(
    argument.value || getArgumentDefaultValue(argument.name, cardArgument) || 0,
  );

  const {numberStep, numberMin, numberMax} = useMemo(() => getArgumentNumberConfig(argument.name, cardArgument), []);

  // Sync state with prop updates
  useEffect(() => {
    if (argument.value !== undefined) {
      setInputValue(argument.value as number);
    }
  }, [argument.value]);

  const onBlur = useCallback(() => {
    changeValue(inputValue);
  }, [inputValue, changeValue]);

  const onChange = useCallback((value: number) => {
    setInputValue(value);
  }, []);

  return (
    <ArgumentItemBase id={id} name={argument.name} removeArg={removeArg} icon={<TextFormatIcon className="size-3.5" />}>
      <NumberField
        onBlur={onBlur}
        step={numberStep}
        value={inputValue}
        variant="secondary"
        onChange={onChange}
        minValue={numberMin}
        maxValue={numberMax}
        aria-label="Argument number input"
        fullWidth>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="w-full" placeholder="Enter argument value here..." />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>
    </ArgumentItemBase>
  );
}
