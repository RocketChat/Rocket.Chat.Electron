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

  // @ts-ignore - ignoring type error since we already know the SelectLegacy component works with this signature
  const handleChangeBrowser = useCallback(
    (value) => {
      dispatch({
        type: SETTINGS_SELECTED_BROWSER_CHANGED,
        payload: value === 'system' ? null : value,
      });
    },
    [dispatch]
  );

  // @ts-ignore - ignoring type error since we already know the SelectLegacy component works with this format
  const options = useMemo(
    () => [
      [
        'system',
        t('settings.options.availableBrowsers.systemDefault', 'System Default'),
      ],
      ...availableBrowsers.map((browser) => [browser, browser]),
    ],
    [availableBrowsers, t]
  );

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel>
          {t('settings.options.availableBrowsers.title', 'Available Browsers')}
        </FieldLabel>
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t(
            'settings.options.availableBrowsers.description',
            'Select a browser to open links'
          )}
        </FieldHint>
      </FieldRow>
      <FieldRow>
        <Box width='full'>
          {/* @ts-ignore - ignoring type error since we already know the SelectLegacy component works with this format */}
          <SelectLegacy
            options={options}
            value={selectedBrowser ?? 'system'}
            onChange={handleChangeBrowser}
            placeholder={t(
              'settings.options.availableBrowsers.loading',
              'Loading browsers...'
            )}
            disabled={availableBrowsers.length === 0}
          />
        </Box>
      </FieldRow>
    </Field>
  );
};
