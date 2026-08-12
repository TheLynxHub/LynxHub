import {Button, Input, TextArea} from '@heroui/react';
import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import {RestartIcon, TextFormatIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {useGetArgumentsByID} from '../../../../../../../plugins/modules';
import {getArgumentDefaultValue} from '../../../../../../../utils/moduleArguments';
import LynxTooltip from '../../../../../../LynxTooltip';
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
 *
 * @returns The rendered InputArgItem component.
 */
export default function InputArgItem({argument, changeValue, removeArg, id}: Props) {
  const cardArgument = useGetArgumentsByID(id);

  const [isInputBox, setIsInputBox] = useState<boolean>(false);
  const [rotateEffect, setRotateEffect] = useState<boolean>(false);

  const [inputValue, setInputValue] = useState<string>(
    argument.value || getArgumentDefaultValue(argument.name, cardArgument) || '',
  );

  // Sync state with prop updates
  useEffect(() => {
    const val =
      argument.value !== undefined && argument.value !== null
        ? argument.value.toString()
        : getArgumentDefaultValue(argument.name, cardArgument) || '';
    setInputValue(val);
  }, [argument.value, argument.name, cardArgument]);

  const onBlur = useCallback(() => {
    changeValue(inputValue);
  }, [inputValue, changeValue]);

  const onChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const isCustomArg = useMemo(() => argument.custom?.kind === 'custom', []);

  const toggleInput = () => setIsInputBox(prev => !prev);

  return (
    <ArgumentItemBase
      extra={
        <LynxTooltip delay={800} content={`Change to ${isInputBox ? 'One line' : 'Multiline'}`}>
          <Button size="sm" variant="ghost" onPress={toggleInput} aria-label="Toggle path type" isIconOnly>
            <RestartIcon
              onAnimationEnd={() => setRotateEffect(false)}
              className={`${rotateEffect && 'animate-[spin_0.5s]'} size-3.5`}
            />
          </Button>
        </LynxTooltip>
      }
      id={id}
      name={argument.name}
      removeArg={removeArg}
      icon={<TextFormatIcon className="size-3.5" />}>
      {isInputBox || isCustomArg ? (
        <TextArea
          onBlur={onBlur}
          className="h-20"
          value={inputValue}
          spellCheck="false"
          variant="secondary"
          onChange={e => onChange(e.target.value)}
          placeholder="Enter argument value here..."
          fullWidth
        />
      ) : (
        <Input
          onBlur={onBlur}
          spellCheck="false"
          value={inputValue}
          variant="secondary"
          onChange={e => onChange(e.target.value)}
          placeholder="Enter argument value here..."
          fullWidth
        />
      )}
    </ArgumentItemBase>
  );
}
