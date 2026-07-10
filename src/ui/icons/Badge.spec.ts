import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import Badge from './Badge';

const badgeMarkup = (value: unknown): string =>
  renderToStaticMarkup(createElement(Badge, { value: value as never }));

describe('Badge', () => {
  it('renders only the background circle when value is missing', () => {
    const html = badgeMarkup(null);

    expect(html).toContain('viewBox="36 33 23 23"');
    expect(html).not.toContain('<circle');
    expect(html).not.toContain('<path d="M44.4 39');
  });

  it('renders the dot branch', () => {
    const html = badgeMarkup('•');

    expect(html).toContain('<circle cx="47.5" cy="44.5" r="3.5"');
  });

  it('renders the numeric branches 1 through 10', () => {
    expect(badgeMarkup(1)).toContain(
      'M44.4 39h4.4v8.8H51V50h-6.6v-2.2h2.2v-6.6h-2.2z'
    );
    expect(badgeMarkup(2)).toContain(
      'M43.1 40.1h1.1V39h6.6v1.1h1.1v4.4h-1.1v1.1h-5.5v2.2h6.6V50h-8.8v-5.5h1.1v-1.1h5.5v-2.2h-4.4v1.1h-2.2z'
    );
    expect(badgeMarkup(3)).toContain(
      'M43.1 40.1h1.1V39h6.6v1.1h1.1v3.3h-1.1v2.2h1.1v3.3h-1.1V50h-6.6v-1.1h-1.1v-2.2h2.2v1.1h4.4v-2.2h-4.4v-2.2h4.4v-2.2h-4.4v1.1h-2.2z'
    );
    expect(badgeMarkup(4)).toContain(
      'M43.1 39h2.2v4.4h4.4V39h2.2v11h-2.2v-4.4h-6.6z'
    );
    expect(badgeMarkup(5)).toContain(
      'M42.9 39h8.8v2.2h-6.6v2.2h5.5v1.1h1.1v4.4h-1.1V50H44v-1.1h-1.1v-2.2h2.2v1.1h4.4v-2.2h-6.6z'
    );
    expect(badgeMarkup(6)).toContain(
      'M43.1 40.1h1.1V39h6.6v1.1h1.1v2.2h-2.2v-1.1h-4.4v2.2h5.5v1.1h1.1v4.4h-1.1V50h-6.6v-1.1h-1.1v-8.8zm2.2 7.7h4.4v-2.2h-4.4v2.2z'
    );
    expect(badgeMarkup(7)).toContain(
      'M42.8 40.1h1.1V39h6.6v1.1h1.1V50h-2.2v-8.8H45v3.3h-2.2z'
    );
    expect(badgeMarkup(8)).toContain(
      'M43.1 40.1h1.1V39h6.6v1.1h1.1v3.3h-1.1v2.2h1.1v3.3h-1.1V50h-6.6v-1.1h-1.1v-3.3h1.1v-2.2h-1.1v-3.3zm2.2 7.7h4.4v-2.2h-4.4v2.2zm0-4.4h4.4v-2.2h-4.4v2.2z'
    );
    expect(badgeMarkup(9)).toContain(
      'M43.1 40.1h1.1V39h6.6v1.1h1.1v8.8h-1.1V50h-6.6v-1.1h-1.1v-2.2h2.2v1.1h4.4v-2.2h-5.5v-1.1h-1.1v-4.4zm2.2 1.1v2.2h4.4v-2.2h-4.4z'
    );
    expect(badgeMarkup(10)).toContain(
      'M39.3 43.5h2v-2h2v2h2v2h-2v2h-2v-2h-2v-2zm7.68-3h1v-1h6v1h1v8h-1v1h-6v-1h-1v-2h2v1h4v-2h-5v-1h-1v-4zm2 1v2h4v-2h-4z'
    );
  });

  it('renders default background and custom color', () => {
    const html = badgeMarkup(1);

    expect(html).toContain('fill="#F5455C"');
    expect(
      renderToStaticMarkup(
        createElement(Badge, { value: 1 as never, backgroundColor: '#00ff00' })
      )
    ).toContain('fill="#00ff00"');
  });
});
