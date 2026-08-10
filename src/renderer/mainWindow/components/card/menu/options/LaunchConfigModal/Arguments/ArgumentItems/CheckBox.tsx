import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import {CheckSquareIcon} from '@solar-icons/react/bold-duotone';

import ArgumentItemBase from './Base';

type Props = {
  /** The argument data */
  argument: ChosenArgument;
  /** Function to remove the argument */
  removeArg: () => void;
  /** Function to change the argument value (unused for CheckBox) */
  changeValue: (value: any) => void;
  /** The ID of the card */
  id: string;
};

/**
 * Renders a CheckBox argument item.
 * Currently, a CheckBox argument presence implies it is active.
 *
 * @returns {JSX.Element} The rendered CheckBoxArgItem component.
 */
export default function CheckBoxArgItem({argument, removeArg, id}: Props) {
  return (
    <ArgumentItemBase
      id={id}
      name={argument.name}
      removeArg={removeArg}
      icon={<CheckSquareIcon className="size-4" />}
    />
  );
}
