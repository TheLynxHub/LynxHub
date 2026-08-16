import {Chip} from '@heroui/react';
import {APP_ICON_TRANSPARENT, APP_NAME} from '@lynx_common/consts';
import applicationIpc from '@lynx_shared/ipc/application';
import storageIpc from '@lynx_shared/ipc/storage';
import {UnreadIcon} from '@solar-icons/react/line-duotone';
import {AnimatePresence} from 'framer-motion';
import {useCallback, useState} from 'react';

import StepComplete from './CompletedStep';
import StepSystemCheck from './SystemCheckStep';
import {RequirementStatus} from './types';
import StepUpdate from './UpdateStep';
import StepWelcome from './WelcomeStep';

type Props = {
  isUpgradeFlow: boolean;
};

const steps = [
  {id: 0, label: 'Welcome'},
  {id: 1, label: 'System & Extensions'},
  {id: 2, label: 'Ready'},
];

const logoBoxClass =
  'relative size-10 rounded-2xl bg-surface border ' +
  'border-surface-secondary flex items-center justify-center p-1.5 shadow-sm';

export default function OnboardingWizard({isUpgradeFlow}: Props) {
  const [step, setStep] = useState<number>(isUpgradeFlow ? 99 : 0); // 99 for upgrade flow
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([]);
  const [requirementStatus, setRequirementStatus] = useState<RequirementStatus | null>(null);

  const completeOnboarding = useCallback(() => {
    storageIpc.update('app', {inited: true});
    applicationIpc.send.changeWinState('restart');
  }, []);

  const handleNextStep = () => setStep(prev => prev + 1);

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepWelcome onNext={handleNextStep} />;
      case 1:
        return (
          <StepSystemCheck
            onNext={handleNextStep}
            installedPlugins={installedPlugins}
            setInstalledPlugins={setInstalledPlugins}
            setRequirementStatus={setRequirementStatus}
          />
        );
      case 2:
        return (
          <StepComplete
            onComplete={completeOnboarding}
            installedPlugins={installedPlugins}
            requirementStatus={requirementStatus}
          />
        );
      case 99: // Special step for returning users on Windows
        return <StepUpdate onComplete={completeOnboarding} />;
      default:
        return <StepWelcome onNext={handleNextStep} />;
    }
  };

  return (
    <div className="relative z-10 size-full flex flex-col justify-between select-none">
      {/* Top Header & Stepped Progress Bar */}
      <header className="flex items-center justify-between px-8 py-4 shrink-0">
        {/* Logo & App Title */}
        <div className="flex items-center gap-3">
          <div className={logoBoxClass}>
            <img alt="App Logo" src={APP_ICON_TRANSPARENT} className="size-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground tracking-tight">{APP_NAME}</h1>
            <p className="text-[11px] font-medium text-muted">First-Time Setup Assistant</p>
          </div>
        </div>

        {/* Stepped Progress Indicator */}
        {!isUpgradeFlow && (
          <nav aria-label="Onboarding Progress" className="flex items-center gap-2">
            {steps.map((s, index) => {
              const isCompleted = step > s.id;
              const isActive = step === s.id;

              const pillClass = isActive
                ? 'bg-accent/20 text-accent-foreground border border-accent/40 shadow-xs'
                : isCompleted
                  ? 'bg-success/20 text-success border border-success/40'
                  : 'bg-surface/60 text-muted border border-surface-secondary';

              const circleClass = isActive
                ? 'bg-accent text-white'
                : isCompleted
                  ? 'bg-success text-success-foreground'
                  : 'bg-foreground/10 text-muted';

              const trackClass = step > index ? 'bg-success/60' : 'bg-surface-secondary';
              const stepPillWrapperClass =
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ' +
                `font-semibold transition-all duration-300 ${pillClass}`;

              return (
                <div key={s.id} className="flex items-center">
                  <div className={stepPillWrapperClass}>
                    <Chip size="sm" className={`size-4 p-0 flex items-center justify-center font-bold ${circleClass}`}>
                      {isCompleted ? (
                        <UnreadIcon className="size-3.5" />
                      ) : (
                        <span className="text-[8pt] mt-0.5">{index + 1}</span>
                      )}
                    </Chip>
                    <span className="hidden sm:inline text-[11px]">{s.label}</span>
                  </div>

                  {index < steps.length - 1 && (
                    <div className={`w-4 h-0.5 mx-1 transition-colors duration-300 ${trackClass}`} />
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main Step Content Area with hidden scrollbar */}
      <main className="flex-1 px-8 py-4 overflow-y-auto scrollbar-hide min-h-0">
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </main>
    </div>
  );
}
