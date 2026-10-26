import { Field, Button, FieldRow, FieldHint } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import { dispatch } from '../../../../store';
import { SETTINGS_CLEAR_E2EE_SEARCH_INDEX_CLICKED } from '../../../actions';

type ClearE2eeSearchIndexProps = {
  className?: string;
};

// Deletes the local search index of encrypted messages for every server and
// user. The index is a cache: the web client fills it again from the server.
export const ClearE2eeSearchIndex = (props: ClearE2eeSearchIndexProps) => {
  const { t } = useTranslation();

  return (
    <Field className={props.className}>
      <FieldRow>
        <Button
          secondary
          danger
          onClick={() => {
            dispatch({ type: SETTINGS_CLEAR_E2EE_SEARCH_INDEX_CLICKED });
          }}
        >
          {t('settings.options.clearE2eeSearchIndex.title')}
        </Button>
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.clearE2eeSearchIndex.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
