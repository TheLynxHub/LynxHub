import {Button, Input} from '@heroui/react';
import {TrashBin2Icon} from '@solar-icons/react/bold-duotone';
import {Reorder} from 'framer-motion';
import {isEmpty} from 'lodash-es';
import {GripVertical} from 'lucide-react';
import {KeyboardEvent, memo, useCallback, useState} from 'react';

type Props = {
  /** The index of the command in the list */
  index: number;
  /** The initial text value of the command */
  initialValue: string;
  /** Callback when the remove button is pressed */
  onRemove?: (index: number) => void;
  /** Callback when the command is edited */
  onEdit?: (index: number, value: string) => void;
  /** Callback when reordering is done */
  onDoneReorder?: () => void;
};

/**
 * Display card for adding, removing, and editing terminal commands.
 * Used in a Reorder.Group list.
 */
const TerminalCommandItem = memo(({initialValue, onEdit, index, onRemove, onDoneReorder}: Props) => {
  const [inputValue, setInputValue] = useState<string>(initialValue);

  const handleEdit = useCallback(() => {
    onEdit?.(index, inputValue);
  }, [index, inputValue, onEdit]);

  const onKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleEdit();
    },
    [handleEdit],
  );

  const remove = useCallback(() => onRemove?.(index), [onRemove, index]);

  return (
    <Reorder.Item
      value={initialValue}
      animate={{opacity: 1}}
      initial={{opacity: 0}}
      onPointerUp={onDoneReorder}
      className="rounded-2xl bg-surface-tertiary cursor-grab active:cursor-grabbing flex items-center gap-x-2 p-2">
      <GripVertical className="text-muted size-4" />
      <span className="text-muted">{index + 1}</span>
      <Input
        onKeyUp={onKeyUp}
        spellCheck="false"
        value={inputValue}
        onBlur={handleEdit}
        autoFocus={isEmpty(initialValue)}
        onChange={e => setInputValue(e.target.value)}
        fullWidth
      />
      <Button
        size="sm"
        variant="ghost"
        onPress={remove}
        className="text-danger-soft-foreground shrink-0 hover:bg-danger-soft-hover"
        isIconOnly>
        <TrashBin2Icon className="size-3.5" />
      </Button>
    </Reorder.Item>
  );
});

export default TerminalCommandItem;
