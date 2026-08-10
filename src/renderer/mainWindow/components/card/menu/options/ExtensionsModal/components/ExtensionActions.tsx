import {Button, Popover, Spinner} from '@heroui/react';
import {
  DownloadMinimalisticIcon,
  InfoCircleIcon,
  LockIcon,
  LockUnlockedIcon,
  TrashBin2Icon,
} from '@solar-icons/react/bold-duotone';
import {X} from 'lucide-react';
import {memo} from 'react';

type RemoveButtonProps = {
  isDisabled: boolean;
  name: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDeletePerman: () => void;
  onMoveToTrash: () => void;
};

export const RemoveButton = memo(
  ({isDisabled, name, isOpen, onOpenChange, onDeletePerman, onMoveToTrash}: RemoveButtonProps) => {
    if (isDisabled) {
      return (
        <Button size="sm" isDisabled={true} variant="danger-soft" aria-label="Remove Extension" isIconOnly>
          <TrashBin2Icon className="size-4" />
        </Button>
      );
    }

    return (
      <Popover isOpen={isOpen} onOpenChange={onOpenChange}>
        <Button size="sm" variant="danger-soft" aria-label="Remove Extension" isIconOnly>
          <TrashBin2Icon className="size-4" />
        </Button>
        <Popover.Content>
          <Popover.Dialog>
            <Popover.Heading>Delete {name}</Popover.Heading>
            <div className="mt-2 flex gap-x-1">
              <Button size="sm" variant="secondary" onPress={onMoveToTrash}>
                <TrashBin2Icon />
                Move to trash
              </Button>
              <Button size="sm" variant="danger-soft" onPress={onDeletePerman}>
                <X className="size-3.5" />
                Delete permanently
              </Button>
            </div>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    );
  },
);

type UpdateButtonProps = {
  status: 'available' | 'initializing' | 'updated' | 'updating';
  onPress?: () => void;
};

export const UpdateButton = memo(({status, onPress}: UpdateButtonProps) => {
  switch (status) {
    case 'available':
      return (
        <Button size="sm" variant="primary" onPress={onPress}>
          <DownloadMinimalisticIcon />
          Available
        </Button>
      );
    case 'initializing':
      return <Spinner size="sm" className="flex" />;
    case 'updated':
      return (
        <Button size="sm" variant="secondary" isDisabled>
          Updated
        </Button>
      );
    case 'updating':
      return (
        <Button size="sm" variant="tertiary" isPending>
          <Spinner size="sm" color="current" />
        </Button>
      );
  }
});

type DisableButtonProps = {
  isDisabled: boolean;
  isLoading?: boolean;
  onPress?: () => void;
  isActionDisabled?: boolean;
};

export const DisableButton = memo(({isDisabled, isLoading, onPress, isActionDisabled}: DisableButtonProps) => {
  if (isActionDisabled) {
    return (
      <Button
        size="sm"
        isDisabled={true}
        variant="tertiary"
        isPending={isLoading}
        aria-label="Extension Information"
        isIconOnly>
        {isLoading ? <Spinner size="sm" color="current" /> : <InfoCircleIcon className="size-5" />}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onPress={onPress}
      variant={isDisabled ? 'tertiary' : 'secondary'}
      aria-label={isDisabled ? 'Enable Extension' : 'Disable Extension'}
      isIconOnly>
      {isDisabled ? <LockIcon className="size-4" /> : <LockUnlockedIcon className="size-4" />}
    </Button>
  );
});
