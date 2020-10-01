import { convertToURL } from './main';

describe('convertToUrl', () => {
  it('transforms localhost into URL(https://localhost/)', () => {
    const input = 'localhost';
    const result = convertToURL(input);

    expect(result.href).toBe('https://localhost/');
  });

  it('transforms localhost:3000 into URL(https://localhost:3000/)', () => {
    const input = 'localhost:3000';
    const result = convertToURL(input);

    expect(result.href).toBe('https://localhost:3000/');
  });

  it('transforms https://localhost into URL(https://localhost/)', () => {
    const input = 'https://localhost';
    const result = convertToURL(input);

    expect(result.href).toBe('https://localhost/');
  });

  it('transforms http://localhost into URL(http://localhost/)', () => {
    const input = 'http://localhost';
    const result = convertToURL(input);

    expect(result.href).toBe('http://localhost/');
  });

  it('transforms https://localhost/ into URL(https://localhost/)', () => {
    const input = 'https://localhost/';
    const result = convertToURL(input);

    expect(result.href).toBe('https://localhost/');
  });

  it('transforms http://localhost/ into URL(http://localhost/)', () => {
    const input = 'http://localhost/';
    const result = convertToURL(input);

    expect(result.href).toBe('http://localhost/');
  });

  it('transforms https://localhost/subdir into URL(https://localhost/subdir/)', () => {
    const input = 'https://localhost/subdir';
    const result = convertToURL(input);

    expect(result.href).toBe('https://localhost/subdir/');
  });

  it('transforms http://localhost:80 into URL(http://localhost/)', () => {
    const input = 'http://localhost:80';
    const result = convertToURL(input);

    expect(result.href).toBe('http://localhost/');
  });

  it('transforms https://localhost:443 into URL(https://localhost/)', () => {
    const input = 'https://localhost:443';
    const result = convertToURL(input);

    expect(result.href).toBe('https://localhost/');
  });
});
