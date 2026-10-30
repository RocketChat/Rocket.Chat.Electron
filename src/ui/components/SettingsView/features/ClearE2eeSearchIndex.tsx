import {
  Box,
  Button,
  Field,
  FieldHint,
  FieldRow,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalFooterControllers,
  ModalHeader,
  ModalHeaderText,
  ModalIcon,
  ModalTitle,
} from '@rocket.chat/fuselage';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { dispatch } from '../../../../store';
import { SETTINGS_CLEAR_E2EE_SEARCH_INDEX_CLICKED } from '../../../actions';
import ModalBackdrop from '../../Modal/ModalBackdrop';

type ClearE2eeSearchIndexProps = {
  className?: string;
};

// Deletes the local search index of encrypted messages for every server and
// user. The web client fills it again from the server, but a large history
// takes long to index, so the user confirms first.
export const ClearE2eeSearchIndex = (props: ClearE2eeSearchIndexProps) => {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleCancel = () => setIsConfirming(false);

  const handleConfirm = () => {
    setIsConfirming(false);
    dispatch({ type: SETTINGS_CLEAR_E2EE_SEARCH_INDEX_CLICKED });
  };

  return (
    <Field className={props.className}>
      <FieldRow>
        <Button secondary danger onClick={() => setIsConfirming(true)}>
          {t('settings.options.clearE2eeSearchIndex.title')}
        </Button>
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.clearE2eeSearchIndex.description')}
        </FieldHint>
      </FieldRow>
      {isConfirming && (
        <ModalBackdrop onDismiss={handleCancel}>
          <Modal>
            <ModalHeader>
              <ModalIcon name='warning' color='danger' />
              <ModalHeaderText>
                <ModalTitle>
                  {t('settings.options.clearE2eeSearchIndex.confirm.title')}
                </ModalTitle>
              </ModalHeaderText>
              <ModalClose onClick={handleCancel} />
            </ModalHeader>
            <ModalContent>
              <Box fontScale='p2'>
                {t('settings.options.clearE2eeSearchIndex.confirm.message')}
              </Box>
            </ModalContent>
            <ModalFooter>
              <ModalFooterControllers>
                <Button secondary onClick={handleCancel}>
                  {t('settings.options.clearE2eeSearchIndex.confirm.cancel')}
                </Button>
                <Button danger onClick={handleConfirm}>
                  {t('settings.options.clearE2eeSearchIndex.confirm.confirm')}
                </Button>
              </ModalFooterControllers>
            </ModalFooter>
          </Modal>
        </ModalBackdrop>
      )}
    </Field>
  );
};
