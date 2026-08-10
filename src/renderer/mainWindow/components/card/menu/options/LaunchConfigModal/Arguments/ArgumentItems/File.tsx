import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import {FileIcon} from '@solar-icons/react/bold-duotone';

import PathArgItem from './Path';

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
 * Renders a File argument item.
 * Uses PathArgItem with type="file" to allow selecting files.
 *
 * @returns {JSX.Element} The rendered FileArgItem component.
 */
export default function FileArgItem({argument, changeValue, removeArg, id}: Props) {
  return (
    <PathArgItem
      id={id}
      type="file"
      argument={argument}
      removeArg={removeArg}
      changeValue={changeValue}
      placeholder="Click to choose file..."
      icon={<FileIcon className="size-4" />}
    />
  );
}
