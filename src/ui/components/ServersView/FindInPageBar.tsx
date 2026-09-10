import styled from '@emotion/styled';
import { Box, TextInput, IconButton } from '@rocket.chat/fuselage';
import type { ChangeEvent, KeyboardEvent, Ref } from 'react';
import { useTranslation } from 'react-i18next';

const Wrapper = styled(Box)`
  position: absolute;
  top: 8px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: var(--rcx-color-surface-light);
  box-shadow: var(--rcx-color-shadow-elevation-1);
`;

type FindInPageBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  activeMatchOrdinal: number;
  matches: number;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  inputRef?: Ref<HTMLInputElement>;
};

export const FindInPageBar = ({
  query,
  onQueryChange,
  activeMatchOrdinal,
  matches,
  onNext,
  onPrevious,
  onClose,
  inputRef,
}: FindInPageBarProps) => {
  const { t } = useTranslation();

  let counterText = '';
  if (query.length > 0) {
    counterText =
      matches > 0
        ? t('findInPage.matchCount', {
            current: activeMatchOrdinal,
            total: matches,
          })
        : t('findInPage.noMatches');
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        onPrevious();
        return;
      }
      onNext();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <Wrapper>
      <TextInput
        ref={inputRef}
        value={query}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onQueryChange(event.target.value)
        }
        onKeyDown={handleKeyDown}
        placeholder={t('findInPage.placeholder')}
        addon={
          <Box fontScale='c1' color='hint'>
            {counterText}
          </Box>
        }
      />
      <IconButton
        icon='chevron-up'
        small
        title={t('findInPage.previous')}
        aria-label={t('findInPage.previous')}
        onClick={onPrevious}
      />
      <IconButton
        icon='chevron-down'
        small
        title={t('findInPage.next')}
        aria-label={t('findInPage.next')}
        onClick={onNext}
      />
      <IconButton
        icon='cross'
        small
        title={t('findInPage.close')}
        aria-label={t('findInPage.close')}
        onClick={onClose}
      />
    </Wrapper>
  );
};
