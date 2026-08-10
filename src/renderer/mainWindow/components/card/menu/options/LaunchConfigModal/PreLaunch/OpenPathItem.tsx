import {Button, Card} from '@heroui/react';
import {TrashBin2Icon} from '@solar-icons/react/bold-duotone';
import {memo, ReactNode, useCallback} from 'react';

type Props = {
  /** The icon to display (file or folder) */
  icon: ReactNode;
  /** Index of the item */
  index: number;
  /** The path string to display */
  path: string;
  /** Callback to remove the item */
  onRemove?: (index: number) => void;
};

/**
 * Display a file or folder path item with a remove button.
 */
const PreOpenPathItem = memo(({path, icon, index, onRemove}: Props) => {
  const remove = useCallback(() => onRemove?.(index), [onRemove, index]);

  return (
    <Card className="py-2 px-4">
      <Card.Content className="flex flex-row items-center gap-x-2">
        {icon}
        <span title={path} className="w-full truncate text-xs">
          {path}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onPress={remove}
          className="shrnik-0 hover:bg-danger-soft-hover text-danger-soft-foreground"
          isIconOnly>
          <TrashBin2Icon className="size-3.5" />
        </Button>
      </Card.Content>
    </Card>
  );
});

export default PreOpenPathItem;
