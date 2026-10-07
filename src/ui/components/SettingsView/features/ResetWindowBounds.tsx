import { Field, Button, FieldRow, FieldHint } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import { invoke } from '../../../../ipc/renderer';

type ResetWindowBoundsProps = {
  className?: string;
};

export const ResetWindowBounds = (props: ResetWindowBoundsProps) => {
  const { t } = useTranslation();

  return (
    <Field className={props.className}>
      <FieldRow>
        <Button
          secondary
          onClick={async () => {
            await invoke('settings-window/reset-window-bounds');
          }}
        >
          {t('settings.options.resetWindowBounds.title')}
        </Button>
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.resetWindowBounds.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
