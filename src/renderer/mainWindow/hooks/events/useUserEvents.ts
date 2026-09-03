import {useAppState} from '@lynx/redux/reducers/app';
import {userActions} from '@lynx/redux/reducers/user';
import {AppDispatch} from '@lynx/redux/store';
import userIpc from '@lynx_shared/ipc/user';
import {useEffect} from 'react';
import {useDispatch} from 'react-redux';

/**
 * Manages user account integration and user state.
 */
export const useUserAccount = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isOnline = useAppState('isOnline');

  useEffect(() => {
    const offReleaseChannel = userIpc.account.onReleaseChannel(stage => dispatch(userActions.setUpdateChannel(stage)));

    return () => offReleaseChannel();
  }, [dispatch]);

  useEffect(() => {
    // Runs on initial mount AND whenever network comes back online
    userIpc.account.getInfo().then(userData => {
      if (userData) {
        dispatch(userActions.setUserState({key: 'userData', value: userData}));
        dispatch(userActions.setUserState({key: 'isLoggedIn', value: true}));
      } else {
        dispatch(userActions.resetUserState('userData'));
        dispatch(userActions.resetUserState('isLoggedIn'));
      }
    });
  }, [dispatch, isOnline]);
};
