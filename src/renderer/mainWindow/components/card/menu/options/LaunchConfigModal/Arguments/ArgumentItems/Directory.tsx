import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import {MoveToFolderIcon} from '@solar-icons/react/bold-duotone';

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
 * Renders a Directory argument item.
 * Uses PathArgItem with type="folder" to allow selecting directories.
 *
 * @returns {JSX.Element} The rendered DirectoryArgItem component.
 */
export default function DirectoryArgItem({argument, changeValue, removeArg, id}: Props) {
  return (
    <PathArgItem
      id={id}
      type="folder"
      argument={argument}
      removeArg={removeArg}
      changeValue={changeValue}
      placeholder="Click to choose folder..."
      icon={<MoveToFolderIcon className="size-4" />}
    />
  );
}
