/**
 * Renderer spec for OutlookCredentialsDialog secure keyboard entry behaviour.
 * Uses react-dom/client + act — no @testing-library/react required.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';

import { OutlookCredentialsDialog } from './index';

const mockInvoke = jest.fn();

jest.mock('../../../ipc/renderer', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

jest.mock('@rocket.chat/fuselage', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    Box: ({
      children,
      ...p
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', p, children),
    Button: ({
      children,
      ...p
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('button', p, children),
    ButtonGroup: ({ children }: React.PropsWithChildren) =>
      React.createElement('div', null, children),
    Callout: ({ children }: React.PropsWithChildren) =>
      React.createElement('div', null, children),
    CheckBox: React.forwardRef(
      (p: Record<string, unknown>, ref: React.Ref<HTMLInputElement>) =>
        React.createElement('input', { type: 'checkbox', ref, ...p })
    ),
    Field: ({ children }: React.PropsWithChildren) =>
      React.createElement('div', null, children),
    FieldError: ({ children }: React.PropsWithChildren) =>
      React.createElement('span', null, children),
    FieldGroup: ({ children }: React.PropsWithChildren) =>
      React.createElement('div', null, children),
    FieldLabel: ({
      children,
      ...p
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('label', p, children),
    FieldRow: ({ children }: React.PropsWithChildren) =>
      React.createElement('div', null, children),
    Label: ({ children }: React.PropsWithChildren) =>
      React.createElement('label', null, children),
    Margins: ({ children }: React.PropsWithChildren) =>
      React.createElement('div', null, children),
    PasswordInput: React.forwardRef(
      (
        { onFocus, onBlur, ...p }: React.InputHTMLAttributes<HTMLInputElement>,
        ref: React.Ref<HTMLInputElement>
      ) =>
        React.createElement('input', {
          'type': 'password',
          'data-testid': 'password-input',
          ref,
          onFocus,
          onBlur,
          ...p,
        })
    ),
    TextInput: React.forwardRef(
      (
        p: React.InputHTMLAttributes<HTMLInputElement>,
        ref: React.Ref<HTMLInputElement>
      ) => React.createElement('input', { ref, ...p })
    ),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'outlook-credentials'),
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('../../../store', () => ({
  listen: jest.fn(() => jest.fn()),
}));

jest.mock('../Dialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    Dialog: ({
      children,
      isVisible,
    }: React.PropsWithChildren<{ isVisible: boolean }>) =>
      isVisible
        ? React.createElement('div', { 'data-testid': 'dialog' }, children)
        : null,
  };
});

const originalPlatform = process.platform;

function renderDialog(): { container: HTMLElement; unmount: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(OutlookCredentialsDialog));
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

function getPasswordInput(container: HTMLElement): HTMLInputElement {
  const el = container.querySelector<HTMLInputElement>(
    '[data-testid="password-input"]'
  );
  if (!el) throw new Error('password input not found');
  return el;
}

describe('OutlookCredentialsDialog — secure keyboard entry', () => {
  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('on darwin', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
    });

    it('calls secure-keyboard-entry/set true when password field is focused', () => {
      const { container, unmount } = renderDialog();
      act(() => {
        Simulate.focus(getPasswordInput(container));
      });
      expect(mockInvoke).toHaveBeenCalledWith(
        'secure-keyboard-entry/set',
        true
      );
      unmount();
    });

    it('calls secure-keyboard-entry/set false when password field is blurred', () => {
      const { container, unmount } = renderDialog();
      act(() => {
        Simulate.focus(getPasswordInput(container));
      });
      mockInvoke.mockClear();
      act(() => {
        Simulate.blur(getPasswordInput(container));
      });
      expect(mockInvoke).toHaveBeenCalledWith(
        'secure-keyboard-entry/set',
        false
      );
      unmount();
    });

    it('re-enables secure keyboard entry on window focus when password field is active', () => {
      const { container, unmount } = renderDialog();
      act(() => {
        Simulate.focus(getPasswordInput(container));
      });
      mockInvoke.mockClear();

      // Simulate OS window regaining focus without DOM focus/blur on the input
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      expect(mockInvoke).toHaveBeenCalledWith(
        'secure-keyboard-entry/set',
        true
      );
      unmount();
    });

    it('does NOT re-enable secure keyboard entry on window focus when password field was never focused', () => {
      const { unmount } = renderDialog();
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });
      expect(mockInvoke).not.toHaveBeenCalledWith(
        'secure-keyboard-entry/set',
        true
      );
      unmount();
    });

    it('does NOT re-enable secure keyboard entry on window focus after password field was blurred', () => {
      const { container, unmount } = renderDialog();
      act(() => {
        Simulate.focus(getPasswordInput(container));
        Simulate.blur(getPasswordInput(container));
      });
      mockInvoke.mockClear();

      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      expect(mockInvoke).not.toHaveBeenCalled();
      unmount();
    });

    it('removes the window focus listener on unmount', () => {
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = renderDialog();
      unmount();
      expect(removeSpy).toHaveBeenCalledWith('focus', expect.any(Function));
      removeSpy.mockRestore();
    });
  });

  describe('on linux', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
    });

    it('does not call secure-keyboard-entry/set on password focus', () => {
      const { container, unmount } = renderDialog();
      act(() => {
        Simulate.focus(getPasswordInput(container));
      });
      expect(mockInvoke).not.toHaveBeenCalled();
      unmount();
    });

    it('does not call secure-keyboard-entry/set on window focus', () => {
      const { unmount } = renderDialog();
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });
      expect(mockInvoke).not.toHaveBeenCalled();
      unmount();
    });
  });

  describe('on win32', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
    });

    it('does not call secure-keyboard-entry/set on password focus', () => {
      const { container, unmount } = renderDialog();
      act(() => {
        Simulate.focus(getPasswordInput(container));
      });
      expect(mockInvoke).not.toHaveBeenCalled();
      unmount();
    });
  });
});
