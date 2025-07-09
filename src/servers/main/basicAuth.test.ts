/**
 * @jest-environment node
 */

import type { Server } from 'http';
import { createServer } from 'http';

import { fetchInfo } from '../renderer';

describe('Basic Auth Support', () => {
  describe('fetchInfo with Basic Auth', () => {
    const serverVersion = '6.0.0';
    let server: Server | null;

    beforeEach((done) => {
      server = createServer((req, res) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Basic ')) {
          res.writeHead(401, {
            'WWW-Authenticate': 'Basic realm="Rocket.Chat Server"',
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify({ error: 'Authentication required' }));
          return;
        }

        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString(
          'ascii'
        );
        const [username, password] = credentials.split(':');

        if (username !== 'testuser' || password !== 'testpass') {
          res.writeHead(401, {
            'WWW-Authenticate': 'Basic realm="Rocket.Chat Server"',
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify({ error: 'Invalid credentials' }));
          return;
        }

        if (req.url === '/') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            '<html><head><title>Rocket.Chat</title></head><body>Welcome</body></html>'
          );
          return;
        }

        if (req.url === '/api/info') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              version: serverVersion,
            })
          );
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      });

      server.listen(3001, done);
    });

    afterEach((done) => {
      if (server) {
        server.close(done);
        server = null;
      } else {
        done();
      }
    });

    it('authenticates successfully with valid credentials', async () => {
      const [effectiveUrl, version] = await fetchInfo(
        'http://testuser:testpass@localhost:3001/'
      );
      expect(effectiveUrl).toStrictEqual('http://localhost:3001/');
      expect(version).toStrictEqual(serverVersion);
    });

    it('fails with wrong credentials', async () => {
      await expect(
        fetchInfo('http://wronguser:wrongpass@localhost:3001/')
      ).rejects.toThrow();
    });

    it('fails when no credentials provided', async () => {
      await expect(fetchInfo('http://localhost:3001/')).rejects.toThrow();
    });
  });

  describe('URL Processing', () => {
    it('correctly extracts credentials from URL', () => {
      const testCases = [
        {
          input: 'http://user:pass@localhost:3001/',
          expected: {
            username: 'user',
            password: 'pass',
            host: 'localhost:3001',
          },
        },
        {
          input: 'https://admin:secret@example.com:8080/subdir/',
          expected: {
            username: 'admin',
            password: 'secret',
            host: 'example.com:8080',
          },
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const url = new URL(input);
        expect(url.username).toBe(expected.username);
        expect(url.password).toBe(expected.password);
        expect(url.host).toBe(expected.host);
      });
    });

    it('decodes special characters in credentials', () => {
      const url = new URL('http://test%40user:pass%3Aword@localhost/');
      expect(decodeURIComponent(url.username)).toBe('test@user');
      expect(decodeURIComponent(url.password)).toBe('pass:word');
    });

    it('creates clean URLs for fetch requests', () => {
      const testCases = [
        {
          input: 'http://user:pass@localhost:3001/',
          expected: 'http://localhost:3001/',
        },
        {
          input: 'https://admin:secret@example.com:8080/subdir/',
          expected: 'https://example.com:8080/subdir/',
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const url = new URL(input);
        const cleanUrl = new URL(url.href);
        cleanUrl.username = '';
        cleanUrl.password = '';
        expect(cleanUrl.href).toBe(expected);
      });
    });
  });

  describe('Authentication Header Creation', () => {
    it('creates correct Basic Auth header', () => {
      const testCases = [
        {
          username: 'testuser',
          password: 'testpass',
          expected: 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
        },
        {
          username: 'admin',
          password: 'secret123',
          expected: 'Basic YWRtaW46c2VjcmV0MTIz',
        },
        {
          username: 'test@user',
          password: 'pass:word!',
          expected: 'Basic dGVzdEB1c2VyOnBhc3M6d29yZCE=',
        },
      ];

      testCases.forEach(({ username, password, expected }) => {
        const authString = `${username}:${password}`;
        const base64Auth = Buffer.from(authString).toString('base64');
        const header = `Basic ${base64Auth}`;
        expect(header).toBe(expected);
      });
    });
  });
});
