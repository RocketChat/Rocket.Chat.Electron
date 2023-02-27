import { Field, Button } from '@rocket.chat/fuselage';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { dispatch } from '../../../../store';
import { SETTINGS_CLEAR_PERMITTED_SCREEN_CAPTURE_PERMISSIONS } from '../../../actions';

type Props = {
  className?: string;
};

export const ClearPermittedScreenCaptureServers: FC<Props> = (props) => {
  const { t } = useTranslation();

  return (
    <Field className={props.className}>
      <Field.Row>
        <Button
          danger
          onClick={async () => {
            console.log('Clearing permitted screen capture servers');
            dispatch({
              type: SETTINGS_CLEAR_PERMITTED_SCREEN_CAPTURE_PERMISSIONS,
            });
          }}
        >
          {t('settings.options.clearPermittedScreenCaptureServers.title')}
        </Button>
      </Field.Row>
      <Field.Row>
        <Field.Hint>
          {t('settings.options.clearPermittedScreenCaptureServers.description')}
        </Field.Hint>
      </Field.Row>
    </Field>
  );
};
