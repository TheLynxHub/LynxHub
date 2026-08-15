import {useAppState} from '@lynx/redux/reducers/app';
import {userActions, useUserState} from '@lynx/redux/reducers/user';
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
  const isLoggedIn = useUserState('isLoggedIn');

  useEffect(() => {
    const offReleaseChannel = userIpc.account.onReleaseChannel(stage => dispatch(userActions.setUpdateChannel(stage)));

    return () => offReleaseChannel();
  }, [dispatch]);

  useEffect(() => {
    if (isLoggedIn) return;

    userIpc.account.getInfo().then(userData => {
      if (userData) {
        dispatch(userActions.setUserState({key: 'userData', value: userData}));
        dispatch(userActions.setUserState({key: 'isLoggedIn', value: true}));
      }
    });
  }, [dispatch, isOnline, isLoggedIn]);
};
