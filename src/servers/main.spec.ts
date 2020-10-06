import { convertToURL } from './main';

describe('convertToUrl', () => {
  it.each([
    ['localhost', 'https://localhost/'],
    ['localhost:3000', 'https://localhost:3000/'],
    ['https://localhost', 'https://localhost/'],
    ['http://localhost', 'http://localhost/'],
    ['https://localhost/', 'https://localhost/'],
    ['http://localhost/', 'http://localhost/'],
    ['https://localhost/subdir', 'https://localhost/subdir/'],
    ['http://localhost:80', 'http://localhost/'],
    ['https://localhost:443', 'https://localhost/'],
  ])('transforms %s into URL(%s)', (input, expected) => {
    const result = convertToURL(input);

    expect(result.href).toBe(expected);
  });
});
