import {Alert, AlertProps, Link} from '@heroui/react';
import {AlertTypes, CustomAlertParams, InitialStep} from '@lynx_common/types/plugins/modules';
import {memo} from 'react';

function getAlertColor(type?: AlertTypes): AlertProps['status'] {
  if (!type) return 'default';

  switch (type) {
    case 'note':
      return 'accent';
    case 'warning':
      return 'warning';
    case 'danger':
      return 'danger';
    case 'default':
    default:
      return 'default';
  }
}

export interface StepAlertProps {
  alert: CustomAlertParams;
}

/**
 * Individual step alert banner with optional external link action triggers.
 */
export const StepAlert = memo(({alert}: StepAlertProps) => {
  return (
    <Alert className="bg-surface-secondary" status={getAlertColor(alert.type)}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{alert.title}</Alert.Title>
        <Alert.Description className="w-full text-start">
          {alert.urls && alert.urls.length > 0 ? (
            <div className="flex w-full flex-col gap-y-2">
              <span>{alert.description}</span>
              {alert.urls.map(url => (
                <Link key={url.title} onPress={() => window.open(url.url)}>
                  {url.title}
                  <Link.Icon />
                </Link>
              ))}
            </div>
          ) : (
            alert.description
          )}
        </Alert.Description>
      </Alert.Content>
    </Alert>
  );
});

export interface StepAlertsProps {
  currentStep: InitialStep;
}

/**
 * Renders all custom alerts attached to the currently active step.
 */
export const StepAlerts = memo(({currentStep}: StepAlertsProps) => {
  if (!currentStep || typeof currentStep === 'string' || !currentStep.alerts?.length) return null;

  return (
    <div className="flex flex-col gap-y-2 py-2">
      {currentStep.alerts.map(alert => (
        <StepAlert alert={alert} key={alert.title} />
      ))}
    </div>
  );
});

export default StepAlerts;
