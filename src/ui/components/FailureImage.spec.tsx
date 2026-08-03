import '@testing-library/jest-dom';
import { render } from '@testing-library/react';

import { FailureImage } from './FailureImage';

describe('FailureImage', () => {
  it('renders an svg with default colors', () => {
    const { container } = render(<FailureImage />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 1366 768');
  });

  it('accepts custom style and color overrides', () => {
    const { container } = render(
      <FailureImage style={{ opacity: 0.5 }} st8='#000000' />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ opacity: '0.5' });
    const strokedPath = container.querySelector('path[stroke]');
    expect(strokedPath).toHaveAttribute('stroke', '#000000');
  });
});
