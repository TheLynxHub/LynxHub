import {Alert, Button, buttonVariants, Link} from '@heroui/react';
import {APP_NAME} from '@lynx_common/consts';
import applicationIpc from '@lynx_shared/ipc/application';
import {CheckReadIcon} from '@solar-icons/react/line-duotone';
import {motion} from 'framer-motion';
import {useCallback, useEffect, useState} from 'react';

import CheckRow from './CheckRow';
import {RowData} from './types';

const containerVariants = {
  hidden: {opacity: 0, y: 20},
  enter: {opacity: 1, y: 0, transition: {staggerChildren: 0.1}},
  exit: {opacity: 0, y: -20},
};

const itemVariants = {hidden: {opacity: 0, y: 10}, enter: {opacity: 1, y: 0}};

type Props = {onComplete: () => void};

const PWS7ReleasePage = 'https://github.com/PowerShell/PowerShell/releases/latest';

export default function StepUpdate({onComplete}: Props) {
  const [pwsh, setPwsh] = useState<RowData>({result: 'unknown'});
  const pwshSatisfied = pwsh.result === 'ok';

  const checkPwsh = useCallback(() => {
    setPwsh({result: 'checking'});
    applicationIpc.invoke
      .checkPwsh7Installed()
      .then(result => setPwsh(result ? {result: 'ok', label: result} : {result: 'failed'}))
      .catch(() => setPwsh({result: 'failed'}));
  }, []);

  useEffect(() => {
    checkPwsh();
  }, [checkPwsh]);

  return (
    <motion.div exit="exit" key="update" animate="enter" initial="hidden" className="pt-8" variants={containerVariants}>
      <motion.h1 variants={itemVariants} className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
        Welcome back to {APP_NAME}!
      </motion.h1>
      <motion.p variants={itemVariants} className="max-w-3xl text-lg text-gray-600 dark:text-gray-300 mb-8">
        Some system requirements have been updated . Before you continue, just need to ensure you have PowerShell 7+
        installed.
      </motion.p>

      <motion.div variants={itemVariants} className="bg-gray-50 dark:bg-white/10 p-6 rounded-3xl my-6">
        <CheckRow status={pwsh} label="PowerShell 7+" description="Required for new features (pwsh v7 or later)" />

        {pwsh.result === 'failed' && (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>PowerShell 7+ is Missing</Alert.Title>
              <Alert.Description>
                PowerShell 7 or later is now required. Please install it to continue.
              </Alert.Description>
            </Alert.Content>
            <Link
              className={buttonVariants({variant: 'primary', size: 'sm'})}
              onPress={() => applicationIpc.send.openUrlDefaultBrowser(PWS7ReleasePage)}>
              Releases Page
              <Link.Icon />
            </Link>
          </Alert>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="flex w-full justify-end">
        <Button
          onPress={onComplete}
          isDisabled={!pwshSatisfied}
          className="font-semibold h-12"
          variant={pwshSatisfied ? 'primary' : 'secondary'}>
          {pwshSatisfied && <CheckReadIcon className="size-5" />}
          {pwshSatisfied ? `Finish & Restart ${APP_NAME}` : 'Waiting for PowerShell...'}
        </Button>
      </motion.div>
    </motion.div>
  );
}
