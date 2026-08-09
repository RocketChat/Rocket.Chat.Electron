import { useTranslation } from 'react-i18next';

import { StatusBar } from '../ui/windowChrome/StatusBar';
import { StatusItem } from '../ui/windowChrome/StatusItem';
import { TextButton } from '../ui/windowChrome/TextButton';

export type DownloadsStatusBarProps = {
  shownCount: number;
  totalCount: number;
  canClear: boolean;
  onClearAll: () => void;
};

export const DownloadsStatusBar = ({
  shownCount,
  totalCount,
  canClear,
  onClearAll,
}: DownloadsStatusBarProps) => {
  const { t } = useTranslation();

  return (
    <StatusBar
      action={
        canClear && (
          <TextButton danger onClick={onClearAll}>
            {t('downloads.clearAll')}
          </TextButton>
        )
      }
    >
      <StatusItem icon='circle-arrow-down'>
        {shownCount === totalCount
          ? t('downloads.count', { count: totalCount })
          : t('downloads.countOfTotal', {
              count: shownCount,
              total: totalCount,
            })}
      </StatusItem>
    </StatusBar>
  );
};
