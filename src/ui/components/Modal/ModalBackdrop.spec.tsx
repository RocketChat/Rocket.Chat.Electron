import { fireEvent, render, screen } from '@testing-library/react';

import ModalBackdrop from './ModalBackdrop';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

describe('ModalBackdrop', () => {
  it('renders its children', () => {
    render(
      <ModalBackdrop onDismiss={jest.fn()}>
        <div data-testid='content'>modal body</div>
      </ModalBackdrop>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('modal body')).toBeInTheDocument();
  });

  it('exposes the backdrop element with the expected class', () => {
    const { container } = render(
      <ModalBackdrop onDismiss={jest.fn()}>
        <div>body</div>
      </ModalBackdrop>
    );

    expect(container.querySelector('.rcx-modal__backdrop')).toBeInTheDocument();
  });

  it('calls onDismiss on a complete click on the backdrop itself', () => {
    const onDismiss = jest.fn();
    const { container } = render(
      <ModalBackdrop onDismiss={onDismiss}>
        <div>body</div>
      </ModalBackdrop>
    );

    const backdrop = container.querySelector(
      '.rcx-modal__backdrop'
    ) as HTMLElement;

    fireEvent.mouseDown(backdrop);
    fireEvent.mouseUp(backdrop);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call onDismiss when the click lands on a child of the backdrop', () => {
    const onDismiss = jest.fn();
    render(
      <ModalBackdrop onDismiss={onDismiss}>
        <div data-testid='content'>body</div>
      </ModalBackdrop>
    );

    const child = screen.getByTestId('content');

    fireEvent.mouseDown(child);
    fireEvent.mouseUp(child);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not call onDismiss when mousedown starts inside and mouseup ends on the backdrop', () => {
    const onDismiss = jest.fn();
    const { container } = render(
      <ModalBackdrop onDismiss={onDismiss}>
        <div data-testid='content'>body</div>
      </ModalBackdrop>
    );

    const backdrop = container.querySelector(
      '.rcx-modal__backdrop'
    ) as HTMLElement;
    const child = screen.getByTestId('content');

    fireEvent.mouseDown(child);
    fireEvent.mouseUp(backdrop);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss when the Escape key is pressed', () => {
    const onDismiss = jest.fn();
    render(
      <ModalBackdrop onDismiss={onDismiss}>
        <div>body</div>
      </ModalBackdrop>
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('ignores non-Escape key presses', () => {
    const onDismiss = jest.fn();
    render(
      <ModalBackdrop onDismiss={onDismiss}>
        <div>body</div>
      </ModalBackdrop>
    );

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('removes the Escape listener on unmount', () => {
    const onDismiss = jest.fn();
    const { unmount } = render(
      <ModalBackdrop onDismiss={onDismiss}>
        <div>body</div>
      </ModalBackdrop>
    );

    unmount();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not throw when dismissed without an onDismiss handler', () => {
    const { container } = render(
      <ModalBackdrop>
        <div>body</div>
      </ModalBackdrop>
    );

    const backdrop = container.querySelector(
      '.rcx-modal__backdrop'
    ) as HTMLElement;

    expect(() => {
      fireEvent.mouseDown(backdrop);
      fireEvent.mouseUp(backdrop);
      fireEvent.keyDown(window, { key: 'Escape' });
    }).not.toThrow();
  });
});
