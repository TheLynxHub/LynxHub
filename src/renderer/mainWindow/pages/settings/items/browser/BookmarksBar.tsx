import {Card, Radio, RadioGroup} from '@heroui/react';
import {BookmarkBarVisibility} from '@lynx_common/types/bookmarks';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import {bookmarksActions, useBookmarksState} from '../../../../redux/reducers/bookmarks';
import {AppDispatch} from '../../../../redux/store';
import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Settings component to configure bookmarks bar visibility.
 */
export default function BookmarksBarSetting() {
  const visibility = useBookmarksState('visibility');
  const dispatch = useDispatch<AppDispatch>();
  const [selectedVisibility, setSelectedVisibility] = useState<BookmarkBarVisibility>(visibility);

  useEffect(() => {
    setSelectedVisibility(visibility);
  }, [visibility]);

  const handleChange = useCallback(
    (value: string) => {
      const v = value as BookmarkBarVisibility;
      setSelectedVisibility(v);
      dispatch(bookmarksActions.setVisibility(v));
      storageIpc.update('browser', {bookmarksBarVisibility: v});
    },
    [dispatch],
  );

  const title = 'Bookmarks Bar';
  const description = 'Choose when the bookmarks bar is displayed';

  const searchTexts = useMemo(
    () => [
      title,
      description,
      'bookmarks',
      'bookmark',
      'favorite',
      'favorites',
      'bar',
      'always',
      'never',
      'visibility',
      'bookmarks bar',
      'when browser is open',
      'always show',
      'never show',
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
          <RadioGroup variant="secondary" onChange={handleChange} value={selectedVisibility} isRequired>
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
              <Radio value="always" className="mt-0">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <SettingsSearchHighlight text="Always show (Default)" />
                </Radio.Content>
              </Radio>
              <Radio className="mt-0" value="browser_open">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <SettingsSearchHighlight text="When browser is open" />
                </Radio.Content>
              </Radio>
              <Radio value="never" className="mt-0">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <SettingsSearchHighlight text="Never show" />
                </Radio.Content>
              </Radio>
            </div>
          </RadioGroup>
        </Card.Content>
      </Card>
    </SettingsFilterItem>
  );
}
