import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useContext, useState } from 'react';

import { TooltipContext } from './TooltipContext';
import TooltipProvider from './TooltipProvider';

jest.mock('@rocket.chat/fuselage-hooks', () => {
  return {
    useDebouncedState: (initial: unknown) => {
      const [state, setState] = useState(initial);
      const set = Object.assign(
        (value: unknown) => {
          setState(value);
        },
        { flush: () => undefined }
      );
      return [state, set];
    },
    useMediaQuery: () => true,
  };
});

jest.mock('./TooltipPortal', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='tooltip-portal'>{children}</div>
  ),
}));

jest.mock('./TooltipComponent', () => ({
  TooltipComponent: ({ title }: { title: React.ReactNode }) => (
    <div data-testid='tooltip-component'>{title}</div>
  ),
}));

const Probe = () => {
  const ctx = useContext(TooltipContext);
  return (
    <button
      type='button'
      onClick={(e) =>
        ctx?.open((<span>Hello tip</span>) as any, e.currentTarget)
      }
      onDoubleClick={() => ctx?.close()}
    >
      hover-me
    </button>
  );
};

describe('TooltipProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('opens tooltip content via context', () => {
    render(
      <TooltipProvider>
        <Probe />
      </TooltipProvider>
    );
    fireEvent.click(screen.getByText('hover-me'));
    expect(screen.getByTestId('tooltip-portal')).toBeInTheDocument();
    expect(screen.getByText('Hello tip')).toBeInTheDocument();
  });

  it('closes tooltip via context close', () => {
    render(
      <TooltipProvider>
        <Probe />
      </TooltipProvider>
    );
    fireEvent.click(screen.getByText('hover-me'));
    expect(screen.getByText('Hello tip')).toBeInTheDocument();

    fireEvent.doubleClick(screen.getByText('hover-me'));
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.queryByTestId('tooltip-portal')).not.toBeInTheDocument();
    expect(screen.queryByText('Hello tip')).not.toBeInTheDocument();
  });
});
