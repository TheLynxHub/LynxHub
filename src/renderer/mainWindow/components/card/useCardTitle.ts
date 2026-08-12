import {updateCardTitle} from '@lynx/plugins/modules';
import storageIpc from '@lynx_shared/ipc/storage';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {isEmpty} from 'lodash-es';
import {useCallback, useEffect, useState} from 'react';

import {useCardStore} from './store';

/**
 * Custom hook to handle card title editing.
 */
export const useCardTitle = () => {
  const id = useCardStore(state => state.id);
  const title = useCardStore(state => state.title);
  const setTitle = useCardStore(state => state.setTitle);

  const [customTitle, setCustomTitle] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    storageIpc.getCustom<string | null>(`${id}_title_edited`).then(value => {
      if (isMounted && value) {
        setCustomTitle(value);
        setTitle(value);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [id, setTitle]);

  const modifiedTitle = customTitle ?? title;

  const onTitleChange = useCallback(
    (target: string) => {
      const newTitle = isEmpty(target) ? title : target;
      AddBreadcrumb_Renderer(`Card Rename: id:${id} to:${newTitle}`);
      setCustomTitle(newTitle);
      setTitle(newTitle);
      updateCardTitle(id, newTitle);
    },
    [id, title, setTitle],
  );

  return {modifiedTitle, onTitleChange};
};
