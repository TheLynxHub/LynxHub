import {Switch} from '@heroui/react';
import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import {CheckSquareIcon} from '@solar-icons/react/bold-duotone';

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
 * Renders a CheckBox argument item.
 * For module-defined CheckBox arguments, presence in the list implies it is active.
 * For custom CheckBox arguments, renders a switch to toggle true/false.
 *
 * @returns {JSX.Element} The rendered CheckBoxArgItem component.
 */
export default function CheckBoxArgItem({argument, removeArg, changeValue, id}: Props) {
  const isCustom = !!argument.custom;
  const isChecked =
    argument.value === undefined
      ? true
      : typeof argument.value === 'boolean'
        ? argument.value
        : argument.value === 'true';

  return (
    <ArgumentItemBase id={id} name={argument.name} removeArg={removeArg} icon={<CheckSquareIcon className="size-4" />}>
      {isCustom && (
        <div className="flex items-center gap-x-2 pb-1">
          <Switch size="sm" isSelected={isChecked} onChange={changeValue} aria-label="Toggle boolean value">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
          <span className="text-xs text-muted">{isChecked ? 'True (Enabled)' : 'False (Disabled)'}</span>
        </div>
      )}
    </ArgumentItemBase>
  );
}
