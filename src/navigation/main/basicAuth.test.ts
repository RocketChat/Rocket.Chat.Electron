/**
 * @jest-environment node
 */

describe('Basic Auth Login Handler', () => {
  describe('URL Processing for Login', () => {
    it('correctly extracts host from auth request URLs', () => {
      const testCases = [
        {
          authUrl: 'http://localhost:3000/api/info',
          serverUrl: 'http://testuser:testpass@localhost:3000/',
          expectedMatch: true,
        },
        {
          authUrl: 'http://localhost:3000/api/info',
          serverUrl: 'http://testuser:testpass@localhost:3001/',
          expectedMatch: false,
        },
        {
          authUrl: 'http://localhost:3000/subdir/api/info',
          serverUrl: 'http://testuser:testpass@localhost:3000/subdir/',
          expectedMatch: true,
        },
      ];

      testCases.forEach(({ authUrl, serverUrl, expectedMatch }) => {
        const authUrlObj = new URL(authUrl);
        const serverUrlObj = new URL(serverUrl);

        const authHost = `${authUrlObj.protocol}//${authUrlObj.host}`;
        const serverHost = `${serverUrlObj.protocol}//${serverUrlObj.host}`;

        const hostMatches = authHost === serverHost;
        const pathMatches = authUrlObj.pathname.startsWith(
          serverUrlObj.pathname
        );

        expect(hostMatches && pathMatches).toBe(expectedMatch);
      });
    });

    it('correctly extracts credentials from server URLs', () => {
      const testCases = [
        {
          serverUrl: 'http://testuser:testpass@localhost:3000/',
          expected: { username: 'testuser', password: 'testpass' },
        },
        {
          serverUrl: 'http://test%40user:pass%3Aword@localhost:3000/',
          expected: { username: 'test@user', password: 'pass:word' },
        },
        {
          serverUrl: 'http://localhost:3000/',
          expected: { username: '', password: '' },
        },
      ];

      testCases.forEach(({ serverUrl, expected }) => {
        const url = new URL(serverUrl);
        const username = decodeURIComponent(url.username);
        const password = decodeURIComponent(url.password);

        expect(username).toBe(expected.username);
        expect(password).toBe(expected.password);
      });
    });

    it('handles login handler logic correctly', () => {
      const servers = [
        { url: 'http://localhost:3001/' },
        { url: 'http://testuser:testpass@localhost:3000/' },
        { url: 'http://otheruser:otherpass@localhost:3000/subdir/' },
      ];

      const authDetails = { url: 'http://localhost:3000/api/info' };

      // Find matching server with credentials
      const matchingServer = servers.find((server) => {
        try {
          const serverUrl = new URL(server.url);
          const authUrl = new URL(authDetails.url);

          const authHost = `${authUrl.protocol}//${authUrl.host}`;
          const serverHost = `${serverUrl.protocol}//${serverUrl.host}`;

          if (authHost === serverHost) {
            if (authUrl.pathname.startsWith(serverUrl.pathname)) {
              return serverUrl.username && serverUrl.password;
            }
          }
          return false;
        } catch {
          return false;
        }
      });

      expect(matchingServer).toBeDefined();
      expect(matchingServer?.url).toBe(
        'http://testuser:testpass@localhost:3000/'
      );
    });
  });
});
