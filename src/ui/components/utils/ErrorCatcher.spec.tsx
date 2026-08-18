import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { ErrorCatcher } from './ErrorCatcher';

const dispatch = jest.fn();

jest.mock('../../../store', () => ({
  dispatch: (...args: any[]) => dispatch(...args),
}));

describe('ErrorCatcher', () => {
  it('renders children when no error', () => {
    render(
      <ErrorCatcher>
        <div>ok</div>
      </ErrorCatcher>
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('renders null children safely', () => {
    const { container } = render(<ErrorCatcher />);
    expect(container).toBeTruthy();
  });
});
