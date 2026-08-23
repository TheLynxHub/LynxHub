import {Button} from '@heroui/react';
import {tabsActions} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {defaultTabItem} from '@lynx/utils/constants';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {motion} from 'framer-motion';
import {Plus} from 'lucide-react';
import {memo, useCallback} from 'react';
import {useDispatch} from 'react-redux';

/**
 * Component to render the "New Tab" button.
 * Adds a new default tab when clicked.
 */
const NewTab = memo(() => {
  const dispatch = useDispatch<AppDispatch>();

  const addTab = useCallback(() => {
    AddBreadcrumb_Renderer('Tabs: Add new tab');
    dispatch(tabsActions.addTab(defaultTabItem));
  }, [dispatch]);

  return (
    <motion.div
      layoutId="new_tab"
      className="shrink-0 notDraggable"
      transition={{duration: 0.37, type: 'spring'}}
      layout>
      <Button size="sm" variant="ghost" onPress={addTab} aria-label="New tab" isIconOnly>
        <Plus size={18} />
      </Button>
    </motion.div>
  );
});

export default NewTab;
