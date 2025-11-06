import {
  Box,
  Option,
  OptionIcon,
  OptionContent,
  OptionDivider,
} from '@rocket.chat/fuselage';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isServerVersionSupported,
  getExpirationMessageTranslated,
} from '../../servers/supportedVersions/main';
import type {
  SupportedVersions,
  MessageTranslated,
} from '../../servers/supportedVersions/types';

type ServerInfoContentProps = {
  url: string;
  version?: string;
  exchangeUrl?: string;
  isSupportedVersion?: boolean;
  supportedVersionsSource?: 'server' | 'cloud' | 'builtin';
  supportedVersionsFetchState?: 'idle' | 'loading' | 'success' | 'error';
  supportedVersions?: SupportedVersions;
  isModal?: boolean;
};

const ServerInfoContent = ({
  url,
  version,
  exchangeUrl,
  isSupportedVersion,
  supportedVersionsSource,
  supportedVersionsFetchState,
  supportedVersions,
  isModal = false,
}: ServerInfoContentProps) => {
  const { i18n, t } = useTranslation();
  const [expirationData, setExpirationData] = useState<
    | {
        expiration: string;
        supported: boolean;
        message?: MessageTranslated;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    const loadExpirationData = async () => {
      if (!version || !supportedVersions) {
        setExpirationData(undefined);
        return;
      }

      try {
        const server = { url, version, title: url };
        const result = await isServerVersionSupported(
          server,
          supportedVersions
        );

        if (result.expiration && result.message) {
          const translatedMessage = getExpirationMessageTranslated(
            result.i18n,
            result.message,
            result.expiration,
            i18n.language,
            url,
            url,
            version
          );

          setExpirationData({
            expiration:
              result.expiration instanceof Date
                ? result.expiration.toISOString()
                : result.expiration,
            supported: result.supported,
            message: translatedMessage || undefined,
          });
        } else if (result.expiration) {
          setExpirationData({
            expiration:
              result.expiration instanceof Date
                ? result.expiration.toISOString()
                : result.expiration,
            supported: result.supported,
            message: undefined,
          });
        } else {
          setExpirationData(undefined);
        }
      } catch (error) {
        console.error('Failed to load expiration data:', error);
        setExpirationData(undefined);
      }
    };

    loadExpirationData();
  }, [url, version, supportedVersions, i18n.language]);

  // Styles for text wrapping (reusable)
  const textWrapStyle = {
    wordBreak: 'break-word' as const,
    overflowWrap: 'break-word' as const,
    whiteSpace: 'normal' as const,
    lineHeight: '1.4',
    hyphens: 'auto' as const,
    maxWidth: '100%',
  };

  return (
    <Box width='100%'>
      {!isModal && (
        <Box display='flex' className='rcx-option__title'>
          {t('serverInfo.title')}
        </Box>
      )}
      <Option>
        <OptionIcon name='globe' />
        <OptionContent style={{ minWidth: 0, overflow: 'visible' }}>
          <Box>
            <Box fontWeight='bold'>{t('serverInfo.urlLabel')}</Box>
            <Box fontSize='x12' color='hint' style={textWrapStyle}>
              {url}
            </Box>
          </Box>
        </OptionContent>
      </Option>
      <Option>
        <OptionIcon name='info' />
        <OptionContent style={{ minWidth: 0, overflow: 'visible' }}>
          <Box>
            <Box fontWeight='bold'>{t('serverInfo.versionLabel')}</Box>
            <Box fontSize='x12' color='hint' style={textWrapStyle}>
              {version || t('serverInfo.unknown')}
            </Box>
          </Box>
        </OptionContent>
      </Option>
      {exchangeUrl && (
        <Option>
          <OptionIcon name='mail' />
          <OptionContent style={{ minWidth: 0, overflow: 'visible' }}>
            <Box>
              <Box fontWeight='bold'>{t('serverInfo.exchangeUrlLabel')}</Box>
              <Box fontSize='x12' color='hint' style={textWrapStyle}>
                {exchangeUrl}
              </Box>
            </Box>
          </OptionContent>
        </Option>
      )}
      {supportedVersions && (
        <>
          <OptionDivider />
          <Box display='flex' className='rcx-option__title'>
            {t('serverInfo.supportedVersionsTitle')}
          </Box>
          <Option>
            <OptionIcon
              name={(() => {
                switch (supportedVersionsFetchState) {
                  case 'loading':
                    return 'loading';
                  case 'error':
                    return 'circle-exclamation';
                  default:
                    return 'info';
                }
              })()}
            />
            <OptionContent style={{ minWidth: 0, overflow: 'visible' }}>
              <Box>
                <Box fontWeight='bold'>{t('serverInfo.statusLabel')}</Box>
                <Box
                  fontSize='x12'
                  color={
                    supportedVersionsFetchState === 'error'
                      ? 'status-font-on-danger'
                      : 'hint'
                  }
                  style={textWrapStyle}
                >
                  {(() => {
                    switch (supportedVersionsFetchState) {
                      case 'loading':
                        return t('serverInfo.status.loading');
                      case 'error':
                        return t('serverInfo.status.error');
                      case 'success':
                        return t('serverInfo.status.loaded');
                      case 'idle':
                      default:
                        return t('serverInfo.status.idle');
                    }
                  })()}
                  {supportedVersionsSource &&
                    ` ${t('serverInfo.status.from', {
                      source: supportedVersionsSource,
                    })}`}
                </Box>
              </Box>
            </OptionContent>
          </Option>
          {(() => {
            let variantValue: 'warning' | 'danger' | undefined = undefined;
            if (expirationData?.message) {
              variantValue = 'warning';
            } else if (isSupportedVersion === false) {
              variantValue = 'danger';
            }

            let statusText = '';
            if (isSupportedVersion === undefined) {
              statusText = t('serverInfo.supported.unknown');
            } else if (expirationData?.message) {
              statusText = t('serverInfo.supported.expiring');
            } else {
              statusText = isSupportedVersion
                ? t('serverInfo.supported.yes')
                : t('serverInfo.supported.no');
            }

            let iconName: 'warning' | 'check' | 'circle-exclamation' | 'help';
            if (expirationData?.message) {
              iconName = 'warning';
            } else if (isSupportedVersion === undefined) {
              iconName = 'help';
            } else if (isSupportedVersion) {
              iconName = 'check';
            } else {
              iconName = 'circle-exclamation';
            }

            return (
              <Option variant={variantValue}>
                <OptionIcon name={iconName} />
                <OptionContent style={{ minWidth: 0, overflow: 'visible' }}>
                  <Box>
                    <Box fontWeight='bold'>Supported:</Box>
                    <Box fontSize='x12' style={textWrapStyle}>
                      {statusText}
                      {supportedVersionsSource &&
                        ` (${supportedVersionsSource})`}
                    </Box>
                  </Box>
                </OptionContent>
              </Option>
            );
          })()}
          <Option>
            <OptionIcon name='clock' />
            <OptionContent style={{ minWidth: 0, overflow: 'visible' }}>
              <Box>
                <Box fontWeight='bold'>Timestamp:</Box>
                <Box fontSize='x12' color='hint' style={textWrapStyle}>
                  {new Date(supportedVersions.timestamp).toLocaleString()}
                </Box>
              </Box>
            </OptionContent>
          </Option>
          <Option>
            <OptionIcon name='warning' />
            <OptionContent style={{ minWidth: 0, overflow: 'visible' }}>
              <Box>
                <Box fontWeight='bold'>Exceptions:</Box>
                {supportedVersions.exceptions?.versions &&
                supportedVersions.exceptions.versions.length > 0 ? (
                  <Box fontSize='x12' color='hint' marginBlockStart='x4'>
                    <Box fontWeight='bold'>Exception Versions:</Box>
                    {supportedVersions.exceptions.versions
                      .slice(0, 3)
                      .map((version, index) => (
                        <Box key={index} marginInlineStart='x8'>
                          <Box style={textWrapStyle}>• {version.version}</Box>
                          <Box
                            fontSize='x10'
                            color='annotation'
                            style={textWrapStyle}
                          >
                            Expires:{' '}
                            {new Date(version.expiration).toLocaleDateString()}
                          </Box>
                        </Box>
                      ))}
                    {supportedVersions.exceptions.versions.length > 3 && (
                      <Box
                        fontSize='x10'
                        color='annotation'
                        marginInlineStart='x8'
                        style={textWrapStyle}
                      >
                        ... and{' '}
                        {supportedVersions.exceptions.versions.length - 3} more
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box fontSize='x12' color='hint' style={textWrapStyle}>
                    No version exceptions configured
                  </Box>
                )}
              </Box>
            </OptionContent>
          </Option>
          {expirationData && (
            <Option variant={expirationData.message ? 'warning' : undefined}>
              <OptionIcon name='calendar' />
              <OptionContent style={{ minWidth: 0, overflow: 'visible' }}>
                <Box>
                  <Box fontWeight='bold'>
                    {t('serverInfo.expiration.label')}
                  </Box>
                  <Box fontSize='x12' style={textWrapStyle}>
                    {t('serverInfo.expiration.expiresOn', {
                      date: new Date(
                        expirationData.expiration
                      ).toLocaleDateString(i18n.language),
                    })}
                  </Box>
                  {expirationData.message && (
                    <Box
                      fontSize='x10'
                      color='annotation'
                      marginBlockStart='x4'
                    >
                      {expirationData.message.title && (
                        <Box fontWeight='bold' style={textWrapStyle}>
                          {expirationData.message.title}
                        </Box>
                      )}
                      {expirationData.message.subtitle && (
                        <Box style={textWrapStyle}>
                          {expirationData.message.subtitle}
                        </Box>
                      )}
                      {expirationData.message.description && (
                        <Box fontSize='x10' style={textWrapStyle}>
                          {expirationData.message.description}
                        </Box>
                      )}
                    </Box>
                  )}
                  <Box fontSize='x10' color='annotation' style={textWrapStyle}>
                    {(() => {
                      const expirationDate = new Date(
                        expirationData.expiration
                      );
                      const today = new Date();

                      const todayMidnight = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate()
                      );
                      const expirationMidnight = new Date(
                        expirationDate.getFullYear(),
                        expirationDate.getMonth(),
                        expirationDate.getDate()
                      );

                      const diffTime =
                        expirationMidnight.getTime() - todayMidnight.getTime();
                      const diffDays = Math.floor(
                        diffTime / (1000 * 60 * 60 * 24)
                      );

                      if (diffDays === 0) {
                        return 'Expires today';
                      }
                      if (diffDays === 1) {
                        return 'Expires in 1 day';
                      }
                      if (diffDays > 0) {
                        return `Expires in ${diffDays} days`;
                      }
                      return 'Expired';
                    })()}
                  </Box>
                </Box>
              </OptionContent>
            </Option>
          )}
        </>
      )}
    </Box>
  );
};

export default ServerInfoContent;
