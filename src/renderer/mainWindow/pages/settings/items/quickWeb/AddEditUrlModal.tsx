import {Button, Input, Modal, Switch} from '@heroui/react';
import type {QuickWebItem} from '@lynx_common/types/storage';
import {BoltIcon, DisketteIcon} from '@solar-icons/react/bold-duotone';
import {useEffect, useState} from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: QuickWebItem | null;
  onSave: (item: {title: string; url: string; preload: boolean; favIcon?: string}) => void;
};

export default function AddEditUrlModal({isOpen, onClose, initialItem, onSave}: Props) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [preload, setPreload] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title || '');
      setUrl(initialItem.url || '');
      setPreload(!!initialItem.preload);
    } else {
      setTitle('');
      setUrl('');
      setPreload(false);
    }
  }, [initialItem, isOpen]);

  const handleSave = () => {
    if (!url.trim()) return;
    onSave({
      title: title.trim() || url.trim(),
      url: url.trim(),
      preload,
      favIcon: initialItem?.favIcon,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{initialItem ? 'Edit Quick Website' : 'Add Quick Website'}</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-y-4 py-2">
              <div className="flex flex-col gap-y-1.5">
                <span className="text-xs font-medium text-muted">Website Title</span>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. GitHub, ChatGPT, Linear"
                />
              </div>

              <div className="flex flex-col gap-y-1.5">
                <span className="text-xs font-medium text-muted">Website URL</span>
                <Input
                  value={url}
                  placeholder="https://..."
                  className="font-JetBrainsMono"
                  onChange={e => setUrl(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2">
                <Switch isSelected={preload} onChange={setPreload}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-x-1.5 text-sm font-medium">
                        <BoltIcon className="size-4 text-warning" />
                        Preload in background
                      </div>
                      <span className="text-xs text-muted">
                        Preload this webpage on app startup so it displays instantly when triggered.
                      </span>
                    </div>
                  </Switch.Content>
                </Switch>
              </div>
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-x-2 pt-4">
              <Button size="sm" variant="ghost" onPress={onClose}>
                Cancel
              </Button>
              <Button size="sm" onPress={handleSave} isDisabled={!url.trim()}>
                <DisketteIcon className="size-4" />
                {initialItem ? 'Update Website' : 'Add Website'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
