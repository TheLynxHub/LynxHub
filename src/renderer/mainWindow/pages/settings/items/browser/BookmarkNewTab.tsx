import {Card, Radio, RadioGroup} from '@heroui/react';
import {BookmarkNewTabBehavior} from '@lynx_common/types/bookmarks';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import {bookmarksActions, useBookmarksState} from '../../../../redux/reducers/bookmarks';
import {AppDispatch} from '../../../../redux/store';
import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Settings component to configure the new tab type created when opening bookmarks.
 */
export default function BookmarkNewTabSetting() {
  const newTabBehavior = useBookmarksState('newTabBehavior');
  const dispatch = useDispatch<AppDispatch>();
  const [selectedBehavior, setSelectedBehavior] = useState<BookmarkNewTabBehavior>(newTabBehavior);

  useEffect(() => {
    setSelectedBehavior(newTabBehavior);
  }, [newTabBehavior]);

  const handleChange = useCallback(
    (value: string) => {
      const v = value as BookmarkNewTabBehavior;
      setSelectedBehavior(v);
      dispatch(bookmarksActions.setNewTabBehavior(v));
      storageIpc.update('browser', {bookmarkNewTabBehavior: v});
    },
    [dispatch],
  );

  const title = 'Bookmark New Tab Behavior';
  const description =
    'Choose whether opening a bookmark in a new tab creates a browser-only tab or a dual terminal & browser tab';

  const searchTexts = useMemo(
    () => [
      title,
      description,
      'bookmarks',
      'bookmark',
      'favorite',
      'favorites',
      'new tab',
      'middle click',
      'terminal',
      'browser',
      'behavior',
      'bookmark new tab behavior',
      'browser only',
      'terminal & browser',
      'dual tab',
    ],
    [],
  );

  return (
    <SettingsFilterItem searchTexts={searchTexts}>
      <Card>
        <Card.Header>
          <Card.Title>
            <SettingsSearchHighlight text={title} />
          </Card.Title>
          <Card.Description>
            <SettingsSearchHighlight text={description} />
          </Card.Description>
        </Card.Header>

        <Card.Content>
          <RadioGroup variant="secondary" onChange={handleChange} value={selectedBehavior} isRequired>
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
              <Radio value="browser" className="mt-0">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <SettingsSearchHighlight text="Browser only (Default)" />
                </Radio.Content>
              </Radio>
              <Radio value="both" className="mt-0">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <SettingsSearchHighlight text="Terminal & Browser" />
                </Radio.Content>
              </Radio>
            </div>
          </RadioGroup>
        </Card.Content>
      </Card>
    </SettingsFilterItem>
  );
}
