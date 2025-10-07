import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    electronAPI?: {
      verifyPassword: (pwd: string) => Promise<boolean>;
      unlockApp: () => Promise<void>;
    };
  }
}

const LockScreen: React.FC = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tryUnlock = async () => {
    setError(null);
    setBusy(true);
    try {
      if (
        !window.electronAPI?.verifyPassword ||
        !window.electronAPI?.unlockApp
      ) {
        setError(t('lockScreen.unlockFailed'));
        return;
      }
      const ok = await window.electronAPI.verifyPassword(password);
      if (ok) {
        await window.electronAPI.unlockApp();
      } else {
        setError(t('lockScreen.incorrect'));
      }
    } catch (e) {
      setError(t('lockScreen.unlockFailed'));
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      tryUnlock();
    }
  };

  return (
    <div style={{ textAlign: 'center', color: 'white' }}>
      <h2 style={{ margin: 0 }}>{t('lockScreen.title')}</h2>
      <p style={{ color: '#ccc', marginTop: 8 }}>
        {t('lockScreen.description')}
      </p>
      <div style={{ marginTop: 18 }}>
        <input
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={onKey}
          placeholder={t('lockScreen.placeholder')}
          style={{
            padding: '8px 10px',
            width: 220,
            borderRadius: 4,
            border: '1px solid #444',
          }}
          disabled={busy}
          autoFocus
        />
        <button
          onClick={tryUnlock}
          disabled={busy}
          style={{ marginLeft: 8, padding: '8px 12px', borderRadius: 4 }}
        >
          {t('lockScreen.unlock')}
        </button>
      </div>
      {error && <div style={{ color: '#ff6b6b', marginTop: 12 }}>{error}</div>}
    </div>
  );
};

export default LockScreen;
