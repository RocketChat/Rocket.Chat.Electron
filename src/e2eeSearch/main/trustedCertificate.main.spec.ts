import type { Certificate } from 'electron';

import {
  createTrustedCertificateVerifyProc,
  createUserCheckFetch,
} from '../trustedCertificate';

const ERR_CERT_AUTHORITY_INVALID = -202;
const ERR_CERT_REVOKED = -206;

const certificate = (data: string) =>
  ({ issuerName: 'Self Signed', data }) as Certificate;

const serialize = ({ issuerName, data }: Certificate) =>
  `${issuerName}\n${data}`;

const verify = (
  trusted: Record<string, string>,
  request: { hostname: string; certificate: Certificate; errorCode: number }
) => {
  const results: number[] = [];
  createTrustedCertificateVerifyProc({
    trustedCertificates: () => trusted,
    serializeCertificate: serialize,
  })(request, (result) => results.push(result));
  return results;
};

describe('createTrustedCertificateVerifyProc', () => {
  const certA = certificate('A');
  const trusted = { 'chat.example.com': serialize(certA) };

  it('accepts the certificate that the user trusted for the host', () => {
    expect(
      verify(trusted, {
        hostname: 'chat.example.com',
        certificate: certA,
        errorCode: ERR_CERT_AUTHORITY_INVALID,
      })
    ).toEqual([0]);
  });

  it('leaves another certificate of the host to Chromium', () => {
    expect(
      verify(trusted, {
        hostname: 'chat.example.com',
        certificate: certificate('B'),
        errorCode: ERR_CERT_AUTHORITY_INVALID,
      })
    ).toEqual([-3]);
  });

  it('leaves the trusted certificate on another host to Chromium', () => {
    expect(
      verify(trusted, {
        hostname: 'other.example.com',
        certificate: certA,
        errorCode: ERR_CERT_AUTHORITY_INVALID,
      })
    ).toEqual([-3]);
  });

  it('never accepts a revoked certificate, also when the user trusted it', () => {
    expect(
      verify(trusted, {
        hostname: 'chat.example.com',
        certificate: certA,
        errorCode: ERR_CERT_REVOKED,
      })
    ).toEqual([-3]);
  });

  it('leaves a certificate that Chromium accepts to Chromium', () => {
    expect(
      verify(trusted, {
        hostname: 'chat.example.com',
        certificate: certA,
        errorCode: 0,
      })
    ).toEqual([-3]);
  });

  it('reads the host of a trust entry with a port', () => {
    expect(
      verify(
        { 'chat.example.com:8443': serialize(certA) },
        {
          hostname: 'chat.example.com',
          certificate: certA,
          errorCode: ERR_CERT_AUTHORITY_INVALID,
        }
      )
    ).toEqual([0]);
  });

  it('reads an IPv6 host with and without brackets', () => {
    const request = {
      certificate: certA,
      errorCode: ERR_CERT_AUTHORITY_INVALID,
    };
    const ipv6Trusted = { '[::1]:8443': serialize(certA) };
    expect(verify(ipv6Trusted, { ...request, hostname: '::1' })).toEqual([0]);
    expect(verify(ipv6Trusted, { ...request, hostname: '[::1]' })).toEqual([0]);
  });

  it('reads the trusted certificates again on each verification', () => {
    const store: Record<string, string> = {};
    const results: number[] = [];
    const proc = createTrustedCertificateVerifyProc({
      trustedCertificates: () => store,
      serializeCertificate: serialize,
    });
    const request = {
      hostname: 'chat.example.com',
      certificate: certA,
      errorCode: ERR_CERT_AUTHORITY_INVALID,
    };
    proc(request, (result) => results.push(result));
    store['chat.example.com'] = serialize(certA);
    proc(request, (result) => results.push(result));
    expect(results).toEqual([-3, 0]);
  });
});

describe('createUserCheckFetch', () => {
  const URL_WITH_PORT = 'https://chat.example.com:8443/sub/api/v1/me';
  const answer = new Response('{}');
  const certError = new Error('net::ERR_CERT_AUTHORITY_INVALID');

  const setup = (
    trustedHosts: string[],
    webviewFetch: () => Promise<Response>
  ) => {
    const trustedFetch = jest.fn(async () => answer);
    const fetch = createUserCheckFetch({
      webviewFetch: jest.fn(webviewFetch),
      trustedFetch,
      hasTrustedCertificate: (host) => trustedHosts.includes(host),
    });
    return { fetch, trustedFetch };
  };

  it('uses only the webview session when it answers', async () => {
    const own = new Response('{}');
    const { fetch, trustedFetch } = setup(
      ['chat.example.com:8443'],
      async () => own
    );
    await expect(fetch(URL_WITH_PORT, {})).resolves.toBe(own);
    expect(trustedFetch).not.toHaveBeenCalled();
  });

  it('asks again through the trusted certificate session for a host with a trusted certificate', async () => {
    const { fetch, trustedFetch } = setup(['chat.example.com:8443'], () =>
      Promise.reject(certError)
    );
    const init = { method: 'GET' };
    await expect(fetch(URL_WITH_PORT, init)).resolves.toBe(answer);
    expect(trustedFetch).toHaveBeenCalledWith(URL_WITH_PORT, init);
  });

  it('fails without a second request for a host with no trusted certificate', async () => {
    const { fetch, trustedFetch } = setup(['chat.example.com'], () =>
      Promise.reject(certError)
    );
    await expect(fetch(URL_WITH_PORT, {})).rejects.toBe(certError);
    expect(trustedFetch).not.toHaveBeenCalled();
  });

  it('fails without a second request after an abort', async () => {
    const { fetch, trustedFetch } = setup(['chat.example.com:8443'], () =>
      Promise.reject(certError)
    );
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetch(URL_WITH_PORT, { signal: controller.signal })
    ).rejects.toBe(certError);
    expect(trustedFetch).not.toHaveBeenCalled();
  });
});
