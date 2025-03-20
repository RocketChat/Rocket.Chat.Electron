import {
  Box,
  Field,
  FieldLabel,
  FieldRow,
  FieldHint,
  Divider,
  Margins,
  SelectLegacy,
} from '@rocket.chat/fuselage';
import { getAvailableBrowsers } from 'detect-browsers';
import { useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import {
  SETTINGS_AVAILABLE_BROWSERS_UPDATED,
  SETTINGS_SELECTED_BROWSER_CHANGED,
} from '../../../actions';

type Browser = {
  browser: string;
  executable: string;
};

type AvailableBrowsersProps = {
  className?: string;
};

export const AvailableBrowsers = (props: AvailableBrowsersProps) => {
  const availableBrowsers = useSelector(
    ({ availableBrowsers }: RootState) => availableBrowsers
  );
  const selectedBrowser = useSelector(
    ({ selectedBrowser }: RootState) => selectedBrowser
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();

  useEffect(() => {
    const detectBrowsers = async () => {
      try {
        const browsers = await getAvailableBrowsers();
        // Just store the browser names, not the full paths
        const browserNames = browsers.map(
          (browser: Browser) => browser.browser
        );

        dispatch({
          type: SETTINGS_AVAILABLE_BROWSERS_UPDATED,
          payload: browserNames,
        });
      } catch (error) {
        console.error('Failed to detect browsers:', error);
        dispatch({
          type: SETTINGS_AVAILABLE_BROWSERS_UPDATED,
          payload: ['Failed to detect browsers'],
        });
      }
    };

    detectBrowsers();
  }, [dispatch]);

  const handleChangeBrowser = useCallback(
    (value: string) => {
      dispatch({
        type: SETTINGS_SELECTED_BROWSER_CHANGED,
        payload: value === 'system' ? null : value,
      });
    },
    [dispatch]
  );

  // Format options for the SelectLegacy component as array of tuples [value, label]
  const options = useMemo(
    (): [string, string][] => [
      [
        'system',
        t('settings.options.availableBrowsers.systemDefault', 'System Default'),
      ],
      ...availableBrowsers.map((browser): [string, string] => [
        browser,
        browser,
      ]),
    ],
    [availableBrowsers, t]
  );

  return (
    <Field className={props.className}>
      <Box
        display='flex'
        flexDirection='row'
        justifyContent='space-between'
        alignItems='flex-start'
      >
        <Box display='flex' flexDirection='column'>
          <FieldLabel>
            {t('settings.options.availableBrowsers.title', 'Default Browser')}
          </FieldLabel>
          <FieldHint>
            {t(
              'settings.options.availableBrowsers.description',
              'Choose which browser will open external links from this app. System Default uses your operating system settings.'
            )}
          </FieldHint>
        </Box>
        <Box display='flex' alignItems='center' style={{ paddingTop: '4px' }}>
          <SelectLegacy
            options={options}
            value={selectedBrowser ?? 'system'}
            onChange={handleChangeBrowser}
            placeholder={t(
              'settings.options.availableBrowsers.loading',
              'Loading browsers...'
            )}
            disabled={availableBrowsers.length === 0}
            width={200}
          />
        </Box>
      </Box>
    </Field>
  );
};
