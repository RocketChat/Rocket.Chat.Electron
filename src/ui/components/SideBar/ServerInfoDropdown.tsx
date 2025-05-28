import {
  Box,
  Dropdown,
  Option,
  OptionIcon,
  OptionContent,
  OptionDivider,
} from '@rocket.chat/fuselage';
import type { RefObject } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isServerVersionSupported,
  getExpirationMessageTranslated,
} from '../../../servers/supportedVersions/main';
import type {
  SupportedVersions,
  MessageTranslated,
} from '../../../servers/supportedVersions/types';

type ServerInfoDropdownProps = {
  reference: RefObject<HTMLElement>;
  target: RefObject<HTMLElement>;
  url: string;
  version?: string;
  isSupportedVersion?: boolean;
  supportedVersionsSource?: 'server' | 'cloud' | 'builtin';
  supportedVersions?: SupportedVersions;
};

const ServerInfoDropdown = ({
  reference,
  target,
  url,
  version,
  isSupportedVersion,
  supportedVersionsSource,
  supportedVersions,
}: ServerInfoDropdownProps) => {
  const { i18n } = useTranslation();
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

      const server = { url, version, title: url };
      const result = await isServerVersionSupported(server, supportedVersions);

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
    };

    loadExpirationData();
  }, [url, version, supportedVersions, i18n.language]);

  return (
    <Dropdown reference={reference} ref={target} placement='right-start'>
      <Box width='300px'>
        <Box display='flex' className='rcx-option__title'>
          Server Information
        </Box>
        <Option>
          <OptionIcon name='globe' />
          <OptionContent>
            <Box>
              <Box fontWeight='bold'>URL:</Box>
              <Box fontSize='x12' color='hint'>
                {url}
              </Box>
            </Box>
          </OptionContent>
        </Option>
        <Option>
          <OptionIcon name='info' />
          <OptionContent>
            <Box>
              <Box fontWeight='bold'>Version:</Box>
              <Box fontSize='x12' color='hint'>
                {version || 'Unknown'}
              </Box>
            </Box>
          </OptionContent>
        </Option>
        {supportedVersions && (
          <>
            <OptionDivider />
            <Box display='flex' className='rcx-option__title'>
              Supported Versions
            </Box>
            <Option
              variant={(() => {
                if (expirationData?.message) return 'warning';
                if (isSupportedVersion === false) return 'danger';
                return undefined;
              })()}
            >
              <OptionIcon
                name={expirationData?.message ? 'warning' : 'check'}
              />
              <OptionContent>
                <Box>
                  <Box fontWeight='bold'>Supported:</Box>
                  <Box fontSize='x12'>
                    {(() => {
                      if (isSupportedVersion === undefined) return 'Unknown';
                      if (expirationData?.message) return 'Expiring';
                      return isSupportedVersion ? 'Yes' : 'No';
                    })()}
                    {supportedVersionsSource && ` (${supportedVersionsSource})`}
                  </Box>
                </Box>
              </OptionContent>
            </Option>
            <Option>
              <OptionIcon name='clock' />
              <OptionContent>
                <Box>
                  <Box fontWeight='bold'>Timestamp:</Box>
                  <Box fontSize='x12' color='hint'>
                    {new Date(supportedVersions.timestamp).toLocaleString()}
                  </Box>
                </Box>
              </OptionContent>
            </Option>
            <Option>
              <OptionIcon name='warning' />
              <OptionContent>
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
                            <Box>• {version.version}</Box>
                            <Box fontSize='x10' color='annotation'>
                              Expires:{' '}
                              {new Date(
                                version.expiration
                              ).toLocaleDateString()}
                            </Box>
                          </Box>
                        ))}
                      {supportedVersions.exceptions.versions.length > 3 && (
                        <Box
                          fontSize='x10'
                          color='annotation'
                          marginInlineStart='x8'
                        >
                          ... and{' '}
                          {supportedVersions.exceptions.versions.length - 3}{' '}
                          more
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box fontSize='x12' color='hint'>
                      No version exceptions configured
                    </Box>
                  )}
                </Box>
              </OptionContent>
            </Option>
            {expirationData && (
              <Option variant={expirationData.message ? 'warning' : undefined}>
                <OptionIcon name='calendar' />
                <OptionContent>
                  <Box>
                    <Box fontWeight='bold'>Expiration:</Box>
                    <Box fontSize='x12'>
                      Expires on{' '}
                      {new Date(expirationData.expiration).toLocaleDateString()}
                    </Box>
                    {expirationData.message && (
                      <Box
                        fontSize='x10'
                        color='annotation'
                        marginBlockStart='x4'
                      >
                        {expirationData.message.title && (
                          <Box fontWeight='bold'>
                            {expirationData.message.title}
                          </Box>
                        )}
                        {expirationData.message.subtitle && (
                          <Box>{expirationData.message.subtitle}</Box>
                        )}
                        {expirationData.message.description && (
                          <Box fontSize='x10'>
                            {expirationData.message.description}
                          </Box>
                        )}
                      </Box>
                    )}
                    <Box fontSize='x10' color='annotation'>
                      {(() => {
                        const expirationDate = new Date(
                          expirationData.expiration
                        );
                        const today = new Date();
                        const diffTime =
                          expirationDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(
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
    </Dropdown>
  );
};

export default ServerInfoDropdown;
