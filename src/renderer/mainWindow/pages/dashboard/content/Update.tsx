import {Button, Card, Chip} from '@heroui/react';
import SettingsSection from '@lynx/components/SettingsSection';
import {modalActions} from '@lynx/redux/reducers/modals';
import {useSettingsState} from '@lynx/redux/reducers/settings';
import {useUserState} from '@lynx/redux/reducers/user';
import {AppDispatch} from '@lynx/redux/store';
import staticsIpc from '@lynx_shared/ipc/statics';
import {DownloadIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

export const DashboardUpdateId = 'settings_update_elem';

type UpdateStatus = {version: string; build: number; date: string};

const DashboardUpdate = memo(() => {
  const userData = useUserState('userData');

  const appUpdateAvailable = useSettingsState('updateAvailable');
  const [statusPublic, setStatusPublic] = useState<UpdateStatus>({version: '?', build: 0, date: '?'});
  const [statusEarly, setStatusEarly] = useState<UpdateStatus>({version: '?', build: 0, date: '?'});
  const [statusInsider, setStatusInsider] = useState<UpdateStatus>({version: '?', build: 0, date: '?'});

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let mounted = true;
    async function fetchStatus() {
      const data = await staticsIpc.getReleases();
      const insider = await staticsIpc.getInsider();

      if (!mounted) return;

      if (data) {
        setStatusPublic({version: data.currentVersion, build: data.currentBuild, date: data.releaseDate});
        if (data.earlyAccess) {
          setStatusEarly({
            version: data.earlyAccess.version,
            build: data.earlyAccess.build,
            date: data.earlyAccess.releaseDate,
          });
        }
      }

      if (insider) {
        setStatusInsider({version: insider.currentVersion, build: insider.currentBuild, date: insider.releaseDate});
      }
    }

    fetchStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const openUpdate = useCallback(() => {
    dispatch(modalActions.openUpdateApp({manual: true}));
  }, [dispatch]);

  const selection = userData.subscribeStage || 'public';

  return (
    <SettingsSection title="Updates" id={DashboardUpdateId} icon={<DownloadIcon className="size-5" />} itemsCenter>
      <div className="w-full">
        <div className="grid grid-cols-3 gap-4">
          {/* Insider Card */}
          <Card className={`${selection === 'insider' && 'border-2'} border-LynxPurple/50`}>
            <Card.Header>
              <div className="flex justify-between items-center">
                <h3 className="text-LynxPurple">Insider</h3>
                <Chip size="sm" color="accent">
                  Latest
                </Chip>
              </div>
            </Card.Header>

            <Card.Content>
              <div className="flex flex-col gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Version:</span>
                  <span>{statusInsider.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Build:</span>
                  <span>{statusInsider.build}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Date:</span>
                  <span>{statusInsider.date}</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Early Access Card */}
          <Card className={`${selection === 'early_access' && 'border-2'} border-warning/50`}>
            <Card.Header>
              <div className="flex justify-between items-center">
                <h3 className="text-warning">Early Access</h3>
                <Chip size="sm" color="warning">
                  Preview
                </Chip>
              </div>
            </Card.Header>

            <Card.Content>
              <div className="flex flex-col gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Version:</span>
                  <span>{statusEarly.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Build:</span>
                  <span>{statusEarly.build}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Date:</span>
                  <span>{statusEarly.date}</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Public Card */}
          <Card className={`${selection === 'public' && 'border-2'} border-success/50`}>
            <Card.Header>
              <h3 className="text-success">Public</h3>
            </Card.Header>

            <Card.Content>
              <div className="flex flex-col gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Version:</span>
                  <span>{statusPublic.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Build:</span>
                  <span>{statusPublic.build}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Date:</span>
                  <span>{statusPublic.date}</span>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {appUpdateAvailable && (
          <Button className="mt-4" onPress={openUpdate} fullWidth>
            Update
          </Button>
        )}
      </div>
    </SettingsSection>
  );
});

DashboardUpdate.displayName = 'DashboardUpdate';

export default DashboardUpdate;
