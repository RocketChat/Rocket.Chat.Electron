import { Select } from '@rocket.chat/fuselage';
import type { SelectOption } from '@rocket.chat/fuselage';
import { useCallback, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { UPDATE_CHANNELS } from '../../../../updates/common';
import { ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED } from '../../../actions';
import { SettingField } from './SettingField';

type UpdateChannelProps = {
  className?: string;
};

/**
 * Which release stream the app updates from.
 *
 * Developer-mode only, and hidden entirely when the build cannot update
 * itself — offering a channel that will never be checked is worse than not
 * offering one.
 */
export const UpdateChannel = (props: UpdateChannelProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const updateChannel = useSelector(
    ({ updateChannel }: RootState) => updateChannel
  );

  const options = useMemo<SelectOption[]>(
    () =>
      UPDATE_CHANNELS.map(
        (channel) =>
          [channel, t(`dialog.about.updateChannel.${channel}`)] as SelectOption
      ).sort(([, a], [, b]) => a.localeCompare(b)),
    [t]
  );

  const handleChange = useCallback(
    (value: unknown) => {
      dispatch({
        type: ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED,
        payload: String(value),
      });
    },
    [dispatch]
  );

  const fieldId = useId();

  return (
    <SettingField
      className={props.className}
      htmlFor={fieldId}
      label={t('dialog.about.updateChannel.label')}
      description={t('dialog.about.updateChannel.description')}
    >
      <Select
        id={fieldId}
        options={options}
        value={updateChannel}
        onChange={handleChange}
      />
    </SettingField>
  );
};
