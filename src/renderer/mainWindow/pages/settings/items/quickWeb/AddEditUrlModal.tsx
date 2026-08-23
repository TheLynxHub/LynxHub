import {Button, Input, Label, Modal, Surface, Switch, TextField} from '@heroui/react';
import TabModal from '@lynx/components/TabModal';
import type {QuickWebItem} from '@lynx_common/types/storage';
import {formatWebAddress} from '@lynx_common/utils';
import {BoltIcon, DisketteIcon, EarthIcon} from '@solar-icons/react/bold-duotone';
import {FormEvent, useEffect, useState} from 'react';

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

  const handleSave = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const rawUrl = url.trim();
    if (!rawUrl) return;

    const formattedUrl = formatWebAddress(rawUrl);
    const finalTitle = title.trim() || formattedUrl;

    onSave({
      title: finalTitle,
      url: formattedUrl,
      preload,
      favIcon: initialItem?.favIcon,
    });
    onClose();
  };

  return (
    <TabModal size="md" isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading className="flex items-center gap-x-2">
          <EarthIcon className="size-5 text-accent-foreground" />
          {initialItem ? 'Edit Quick Website' : 'Add Quick Website'}
        </Modal.Heading>
      </Modal.Header>

      <form onSubmit={handleSave}>
        <Modal.Body className="flex flex-col gap-y-4 py-2">
          <TextField name="title">
            <Label className="text-xs font-semibold text-foreground">Website Title</Label>
            <Input
              value={title}
              variant="secondary"
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. GitHub, ChatGPT, Linear"
            />
          </TextField>

          <TextField name="url" isRequired>
            <Label className="text-xs font-semibold text-foreground">Website URL</Label>
            <Input
              value={url}
              variant="secondary"
              placeholder="https://example.com"
              className="font-JetBrainsMono text-xs"
              onChange={e => setUrl(e.target.value)}
              required
              autoFocus
            />
          </TextField>

          <Surface
            variant="secondary"
            onClick={() => setPreload(!preload)}
            className="p-3 rounded-2xl border border-border/70 flex items-start gap-3 cursor-pointer mt-1">
            <Switch size="sm" isSelected={preload} onChange={setPreload} className="mt-0.5 pointer-events-none">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
            <div className="flex flex-col gap-y-0.5">
              <div className="flex items-center gap-x-1.5 text-xs font-semibold text-foreground">
                <BoltIcon className="size-3.5 text-warning" />
                Preload in background on startup
              </div>
              <span className="text-[11px] text-muted">
                Preload this webpage when LynxHub launches for instantaneous zero-delay opening.
              </span>
            </div>
          </Surface>
        </Modal.Body>

        <Modal.Footer className="flex justify-end gap-x-2 pt-4">
          <Button size="sm" variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" variant="primary" isDisabled={!url.trim()}>
            <DisketteIcon className="size-4" />
            {initialItem ? 'Save Changes' : 'Add Website'}
          </Button>
        </Modal.Footer>
      </form>
    </TabModal>
  );
}
