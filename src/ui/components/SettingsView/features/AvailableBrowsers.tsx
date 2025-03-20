import {
  Box,
  Field,
  FieldLabel,
  FieldHint,
  SelectLegacy,
} from '@rocket.chat/fuselage';
import { useEffect, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SELECTED_BROWSER_CHANGED } from '../../../actions';

type AvailableBrowsersProps = {
  className?: string;
};

/**
 * AvailableBrowsers component
 *
 * This component displays a list of available browsers for the user to select
 * as the default for opening external links. It relies on the Redux store for
 * browser data which is loaded lazily by the browserLauncher utility.
 *
 * The browsers are not loaded when this component mounts, but rather when the
 * app is fully initialized, or when the user first needs to open an external link.
 */
export const AvailableBrowsers = (props: AvailableBrowsersProps) => {
  const availableBrowsers = useSelector(
    ({ availableBrowsers }: RootState) => availableBrowsers
  );
  const selectedBrowser = useSelector(
    ({ selectedBrowser }: RootState) => selectedBrowser
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(availableBrowsers.length === 0);

  useEffect(() => {
    if (availableBrowsers.length > 0) {
      setIsLoading(false);
    }
  }, [availableBrowsers]);

  const handleChangeBrowser = useCallback(
    (value: string) => {
      dispatch({
        type: SETTINGS_SELECTED_BROWSER_CHANGED,
        payload: value === 'system' ? null : value,
      });
    },
    [dispatch]
  );

  const options = useMemo(
    (): [string, string][] => [
      ['system', t('settings.options.availableBrowsers.systemDefault')],
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
            {t('settings.options.availableBrowsers.title')}
          </FieldLabel>
          <FieldHint>
            {t('settings.options.availableBrowsers.description')}
          </FieldHint>
        </Box>
        <Box display='flex' alignItems='center' style={{ paddingTop: '4px' }}>
          <SelectLegacy
            options={options}
            value={selectedBrowser ?? 'system'}
            onChange={handleChangeBrowser}
            placeholder={t('settings.options.availableBrowsers.loading')}
            disabled={isLoading || availableBrowsers.length === 0}
            width={200}
          />
        </Box>
      </Box>
    </Field>
  );
};
