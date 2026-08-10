import {Description, Link, Spinner, Table} from '@heroui/react';
import filesIpc from '@lynx_shared/ipc/files';
import {InboxIcon} from '@solar-icons/react/bold-duotone';
import {motion} from 'framer-motion';
import {startCase} from 'lodash-es';
import {memo, useCallback, useEffect, useMemo, useState} from 'react';

import EmptyStateCard from '../../../../EmptyStateCard';
import {DisableButton, RemoveButton, UpdateButton} from './components/ExtensionActions';
import {tabContentVariants} from './Constants';
import {ExtensionData, ExtensionStatus} from './hooks/useInstalledExtensions';

type Props = {
  visible: boolean;
  dir: string;
  isOpen: boolean;
  extensions: ExtensionData[];
  statusMap: Map<string, ExtensionStatus>;
  isLoading: boolean;
  getExtensions: () => void;
  checkUpdates: () => void;
  deleteExtension: (name: string, type: 'removeDir' | 'trashDir') => void;
  disableExtension: (name: string, isDisabled: boolean, targetDir: string) => void;
  updateExtension: (name: string) => void;
};

const Installed = memo(
  ({
    visible,
    dir,
    isOpen,
    extensions,
    statusMap,
    isLoading,
    getExtensions,
    checkUpdates,
    deleteExtension,
    disableExtension,
    updateExtension,
  }: Props) => {
    // Local state for delete confirmation modals
    const [deleteModalStates, setDeleteModalStates] = useState<Map<string, boolean>>(new Map());

    const toggleDeleteModal = useCallback((name: string, isOpen: boolean) => {
      setDeleteModalStates(prev => new Map(prev).set(name, isOpen));
    }, []);

    // Initial data fetch
    useEffect(() => {
      if (isOpen) {
        getExtensions();
      }
    }, [isOpen, getExtensions]);

    // Check updates after extensions are loaded
    useEffect(() => {
      if (!isLoading && extensions.length > 0) {
        checkUpdates();
      }
    }, [isLoading, extensions.length, checkUpdates]);

    const onDoubleClick = useCallback(
      (name: string) => {
        console.log('double clicked');
        filesIpc.openPath(`${dir}/${name}`);
      },
      [dir],
    );

    const rows = useMemo(() => {
      return extensions.map(ext => {
        const status = statusMap.get(ext.name) || {
          isUpdating: false,
          isDisabled: false,
          hasUpdate: false,
          isDeleting: false,
          resultDir: `${dir}/${ext.name}`,
        };

        const isDeleteModalOpen = deleteModalStates.get(ext.name) || false;

        return {
          key: ext.name,
          name: ext.name, // We render the link in the cell
          size: ext.size,
          remoteUrl: ext.remoteUrl,
          status,
          isDeleteModalOpen,
        };
      });
    }, [extensions, statusMap, deleteModalStates, dir]);

    const renderCell = useCallback(
      (row: any) => {
        const status = row.status as ExtensionStatus;

        return (
          <>
            <Table.Cell>
              <Link onPress={() => window.open(row.remoteUrl)}>
                {startCase(row.name)}
                <Link.Icon />
              </Link>
            </Table.Cell>
            <Table.Cell>{row.size}</Table.Cell>
            <Table.Cell>
              <UpdateButton
                onPress={() => updateExtension(row.name)}
                status={status.isUpdating ? 'updating' : status.hasUpdate ? 'available' : 'updated'}
              />
            </Table.Cell>
            <Table.Cell>
              <RemoveButton
                name={row.name}
                isDisabled={status.isDeleting}
                isOpen={row.isDeleteModalOpen}
                onOpenChange={open => toggleDeleteModal(row.name, open)}
                onMoveToTrash={() => deleteExtension(row.name, 'trashDir')}
                onDeletePerman={() => deleteExtension(row.name, 'removeDir')}
              />
            </Table.Cell>
            <Table.Cell>
              <DisableButton
                isLoading={false} // Loading state not fully tracked for disable in hook yet, or we can add it
                isDisabled={status.isDisabled}
                onPress={() => disableExtension(row.name, status.isDisabled, status.resultDir || `${dir}/${row.name}`)}
              />
            </Table.Cell>
          </>
        );
      },
      [toggleDeleteModal, deleteExtension, disableExtension, updateExtension, dir],
    );

    if (!visible) return null;

    const emptyContent = isLoading ? (
      <div className="flex flex-col gap-y-2 items-center">
        <Spinner size="lg" />
        <Description className="text-sm">Checking for installed extensions</Description>
      </div>
    ) : (
      <EmptyStateCard
        icon={<InboxIcon size={40} />}
        bodyClassName="py-8 bg-surface-secondary"
        description="No extension installed to display."
      />
    );

    return (
      <motion.div initial="init" animate="animate" variants={tabContentVariants}>
        <Table>
          <Table.ScrollContainer>
            <Table.Content>
              <Table.Header>
                <Table.Column isRowHeader>Name</Table.Column>
                <Table.Column>Size</Table.Column>
                <Table.Column>Update Status</Table.Column>
                <Table.Column>Remove</Table.Column>
                <Table.Column>Disable</Table.Column>
              </Table.Header>
              <Table.Body renderEmptyState={() => emptyContent}>
                {rows.map(row => (
                  <Table.Row key={row.key} onDoubleClick={() => onDoubleClick(row.name)}>
                    {renderCell(row)}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </motion.div>
    );
  },
);

export default Installed;
