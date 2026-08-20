import {
  useAppTitleEvents,
  useBookmarksEvents,
  useBrowserEvents,
  useCheckCardsUpdate,
  useCheckPluginsUpdate,
  useContextEvents,
  useHotkeyEvents,
  useIpcEvents,
  useListenForUpdateError,
  useNewTabEvents,
  useOnlineEvents,
  useShowToast,
  useStorageData,
  useUserAccount,
} from './events';

/** Listening for various app events and modify redux states */
export default function useAppEvents() {
  useCheckCardsUpdate();
  useCheckPluginsUpdate();
  useOnlineEvents();
  useStorageData();
  useUserAccount();
  useIpcEvents();
  useAppTitleEvents();
  useHotkeyEvents();
  useNewTabEvents();
  useBrowserEvents();
  useBookmarksEvents();
  useContextEvents();
  useShowToast();
  useListenForUpdateError();
}
