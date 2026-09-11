import {Button, ButtonProps, Spinner, Tooltip} from '@heroui/react';
import {pluginsActions, useIsUpdatingPlugin, usePluginsState} from '@lynx/redux/reducers/plugins';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import {PluginItem} from '@lynx_common/types/plugins';
import pluginsIpc from '@lynx_shared/ipc/plugins';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {ArrowDownIcon} from '@solar-icons/react/line-duotone';
import {useCallback, useMemo} from 'react';
import {useDispatch} from 'react-redux';

import {topToast} from '../../layouts/ToastProviders';

/**
 * Props for the UpdateButton component.
 */
interface UpdateButtonProps {
  /** The plugin item for which you want to display the update or downgrade buttons. */
  item: PluginItem;
  /** Whether to render only the icon without text. */
  isIconOnly?: boolean;
}

/**
 * Button component that handles syncing a plugin to its remote codebase,
 * either by upgrading or downgrading. Provides UI feedback during the operation.
 */
export function UpdateButton({item, isIconOnly = false}: UpdateButtonProps) {
  const dispatch = useDispatch<AppDispatch>();
  const syncList = usePluginsState('syncList');
  const isUpdating = useIsUpdatingPlugin(item.metadata.id);
  const updatingAll = usePluginsState('updatingAll');

  const {id, title} = useMemo(() => item.metadata, [item]);

  const {updateItem, isUpgrade, variant} = useMemo(() => {
    const updateTarget = syncList.find(available => available.id === id);
    const upgradeState = updateTarget?.type === 'upgrade';

    const variant: ButtonProps['variant'] = isUpdating ? 'ghost' : upgradeState ? 'primary' : 'danger-soft';

    return {updateItem: updateTarget, isUpgrade: upgradeState, variant};
  }, [syncList, id]);

  // Determine the button text based on update state
  const text = useMemo(() => {
    return isUpdating ? (isUpgrade ? 'Upgrading...' : 'Downgrading...') : isUpgrade ? 'Upgrade' : 'Downgrade';
  }, [isUpdating, isUpgrade]);

  const handleSync = useCallback(() => {
    if (!updateItem) return;

    AddBreadcrumb_Renderer(`Plugin sync: id:${id}`);
    dispatch(pluginsActions.manageSet({key: 'updating', id, operation: 'add'}));

    const {version} = updateItem;

    pluginsIpc.sync(id, version).then(isUpdated => {
      if (isUpdated) {
        topToast.success(`${title} synced Successfully`);
        showRestartModal(dispatch, 'To apply the changes, please restart the app.');
        dispatch(pluginsActions.updateInstalledVersion({id, version}));
      }
      dispatch(pluginsActions.removeUpdateItem({id, isUpdated}));
    });
  }, [dispatch, id, title, updateItem]);

  if (!updateItem) {
    return null;
  }

  const buttonEl = (
    <Button
      size="sm"
      variant={variant}
      onPress={handleSync}
      isPending={isUpdating}
      isIconOnly={isIconOnly}
      isDisabled={updatingAll}>
      {isUpdating ? <Spinner size="sm" color="current" /> : <ArrowDownIcon className="size-3.5" />}
      {!isIconOnly && text}
    </Button>
  );

  if (isIconOnly) {
    return (
      <Tooltip delay={300}>
        <Tooltip.Trigger>{buttonEl}</Tooltip.Trigger>
        <Tooltip.Content showArrow>
          <Tooltip.Arrow />
          <p>{text}</p>
        </Tooltip.Content>
      </Tooltip>
    );
  }

  return buttonEl;
}
