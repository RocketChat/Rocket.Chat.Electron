import {
  Accordion,
  Box,
  Button,
  ButtonGroup,
  Divider,
  Tag,
  Throbber,
} from '@rocket.chat/fuselage';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { invoke } from '../../../../ipc/renderer';
import type {
  TelephonyDiagnosticCheck,
  TelephonyDiagnostics as TelephonyDiagnosticsData,
} from '../../../../telephony/diagnostics';

type DiagnosticStatus = TelephonyDiagnosticCheck['status'];

const STATUS_TAG_VARIANT: Record<
  DiagnosticStatus,
  'primary' | 'danger' | 'warning'
> = {
  pass: 'primary',
  fail: 'danger',
  unknown: 'warning',
};

const STATUS_FALLBACK: Record<DiagnosticStatus, string> = {
  pass: 'Pass',
  fail: 'Fail',
  unknown: 'Unknown',
};

const statusLabelKey = (status: DiagnosticStatus): string =>
  `telephony.diagnostics.status.${status}`;

const formatDetailsForDisplay = (details: string): string =>
  details.replace(/\s+at\s+\/[^\s].*$/, '');

const PLATFORM_LABEL: Record<string, string> = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux',
  aix: 'AIX',
  freebsd: 'FreeBSD',
  openbsd: 'OpenBSD',
  sunos: 'SunOS',
};

const formatPlatformForDisplay = (platform: string): string =>
  PLATFORM_LABEL[platform] ?? platform;

export const TelephonyDiagnostics = () => {
  const { t } = useTranslation();
  const [diagnostics, setDiagnostics] =
    useState<TelephonyDiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke('telephony/get-diagnostics');
      setDiagnostics(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDiagnostics();
  }, [fetchDiagnostics]);

  const handleRefresh = useCallback(() => {
    void fetchDiagnostics();
  }, [fetchDiagnostics]);

  const handleCopy = useCallback(() => {
    if (!diagnostics) return;
    void navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [diagnostics]);

  const summaryTag = useMemo(() => {
    if (loading || !diagnostics) {
      return (
        <Box flexShrink={0}>
          <Tag variant='secondary'>
            {t('telephony.diagnostics.summary.checking')}
          </Tag>
        </Box>
      );
    }
    const failureCount = diagnostics.checks.filter(
      (c) => c.status === 'fail'
    ).length;
    const unknownCount = diagnostics.checks.filter(
      (c) => c.status === 'unknown'
    ).length;
    if (failureCount > 0) {
      return (
        <Box flexShrink={0}>
          <Tag variant='danger'>
            {t('telephony.diagnostics.summary.issues', { count: failureCount })}
          </Tag>
        </Box>
      );
    }
    if (unknownCount > 0) {
      return (
        <Box flexShrink={0}>
          <Tag variant='warning'>
            {t('telephony.diagnostics.summary.warnings', {
              count: unknownCount,
            })}
          </Tag>
        </Box>
      );
    }
    return (
      <Box flexShrink={0}>
        <Tag variant='primary'>
          {t('telephony.diagnostics.summary.healthy')}
        </Tag>
      </Box>
    );
  }, [loading, diagnostics, t]);

  const accordionTitle = (
    <Box
      display='flex'
      alignItems='center'
      justifyContent='space-between'
      width='100%'
    >
      <Box display='flex' flexDirection='column' mie='x8'>
        <Box fontScale='h4' color='default'>
          {t('telephony.diagnostics.title')}
        </Box>
        <Box fontScale='c1' color='hint' marginBlockStart='x4'>
          {t('telephony.diagnostics.subtitle')}
        </Box>
      </Box>
      {summaryTag}
    </Box>
  );

  return (
    <Accordion marginBlock='x16'>
      <Accordion.Item title={accordionTitle}>
        <Box
          display='flex'
          flexDirection='row'
          justifyContent='flex-end'
          alignItems='flex-start'
          marginBlockEnd='x16'
        >
          <ButtonGroup small>
            <Button
              type='button'
              icon='reload'
              onClick={handleRefresh}
              disabled={loading}
              small
            >
              {t('telephony.diagnostics.refresh')}
            </Button>
            <Button
              type='button'
              icon={copied ? 'check' : 'copy'}
              onClick={handleCopy}
              disabled={!diagnostics}
              small
            >
              {copied
                ? t('telephony.diagnostics.copied')
                : t('telephony.diagnostics.copy')}
            </Button>
          </ButtonGroup>
        </Box>
        {loading && (
          <Box display='flex' justifyContent='center' paddingBlock='x24'>
            <Throbber />
          </Box>
        )}
        {!loading && diagnostics && (
          <Box>
            {diagnostics.checks.map((check, index) => (
              <Fragment key={check.id}>
                {index > 0 && <Divider marginBlock='x0' />}
                <Box display='flex' alignItems='center' paddingBlock='x12'>
                  <Box flexGrow={1} mie='x16'>
                    <Box fontScale='p2' color='default'>
                      {t(`telephony.diagnostics.checks.${check.id}`, {
                        defaultValue: check.label,
                      })}
                    </Box>
                    {check.details && (
                      <Box
                        fontScale='c1'
                        color='hint'
                        marginBlockStart='x4'
                        style={{ wordBreak: 'break-word' }}
                        title={check.details}
                      >
                        {formatDetailsForDisplay(check.details)}
                      </Box>
                    )}
                  </Box>
                  <Box flexShrink={0}>
                    <Tag
                      variant={STATUS_TAG_VARIANT[check.status]}
                      data-testid='telephony-diagnostic-status'
                      data-status={check.status}
                    >
                      {t(statusLabelKey(check.status), {
                        defaultValue: STATUS_FALLBACK[check.status],
                      })}
                    </Tag>
                  </Box>
                </Box>
              </Fragment>
            ))}
            <Divider marginBlock='x0' />
            <Box
              display='flex'
              justifyContent='space-between'
              alignItems='center'
              flexWrap='wrap'
              paddingBlockStart='x12'
              fontScale='micro'
              color='hint'
            >
              <Box is='span'>
                {t('telephony.diagnostics.platform', {
                  defaultValue: 'Platform',
                })}
                {': '}
                {formatPlatformForDisplay(diagnostics.platform)}
              </Box>
              <Box is='span'>
                {t('telephony.diagnostics.lastChecked', {
                  defaultValue: 'Last checked',
                })}
                {': '}
                {new Date(diagnostics.generatedAt).toLocaleString()}
              </Box>
            </Box>
          </Box>
        )}
      </Accordion.Item>
    </Accordion>
  );
};
