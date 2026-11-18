import type { Certificate } from 'electron';

// The user check of a server with a certificate that the user trusted in the
// certificate dialog (navigation/main.ts). That dialog answers the
// `certificate-error` event of a page load only. A request of the main
// process (`session.fetch`) gets no such event: Electron fails each
// certificate error of it. So the check asks such a server again through a
// session of its own, which accepts only the certificate that the user
// trusted for the host. The webview session stays as it is.

// Chromium net error codes (net/base/net_error_list.h).
const NET_OK = 0;
const NET_ERR_CERT_REVOKED = -206;

// The answers of a certificate verify proc.
const ACCEPT = 0;
const USE_CHROMIUM_RESULT = -3;

type TrustedCertificates = Record<string, string>;

type VerifyRequest = {
  hostname: string;
  certificate: Certificate;
  errorCode: number;
};

// The verify proc gets a host name, an IPv6 address maybe without brackets.
const withoutBrackets = (hostname: string) =>
  hostname.replace(/^\[(.*)\]$/, '$1');

// The host of a trust entry is the `host` of the URL: the name and the port.
const hostnameOf = (host: string): string | undefined => {
  try {
    return withoutBrackets(new URL(`https://${host}`).hostname);
  } catch {
    return undefined;
  }
};

export const createTrustedCertificateVerifyProc =
  ({
    trustedCertificates,
    serializeCertificate,
  }: {
    trustedCertificates(): TrustedCertificates;
    serializeCertificate(certificate: Certificate): string;
  }) =>
  (request: VerifyRequest, callback: (result: number) => void): void => {
    // Like the certificate dialog, a revoked certificate is never trusted.
    if (
      request.errorCode === NET_OK ||
      request.errorCode === NET_ERR_CERT_REVOKED
    ) {
      callback(USE_CHROMIUM_RESULT);
      return;
    }
    const hostname = withoutBrackets(request.hostname.toLowerCase());
    const serialized = serializeCertificate(request.certificate);
    const trusted = Object.entries(trustedCertificates()).some(
      ([host, certificate]) =>
        certificate === serialized && hostnameOf(host) === hostname
    );
    callback(trusted ? ACCEPT : USE_CHROMIUM_RESULT);
  };

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

// The webview session asks first, so its proxy and client certificate apply
// as before. Only when it fails, and the user trusted a certificate for the
// exact host and port of the URL, the trusted certificate session asks again.
// A certificate error fails in the TLS handshake, before the request sends
// the login token.
export const createUserCheckFetch =
  ({
    webviewFetch,
    trustedFetch,
    hasTrustedCertificate,
  }: {
    webviewFetch: Fetch;
    trustedFetch: Fetch;
    hasTrustedCertificate(host: string): boolean;
  }): Fetch =>
  async (url, init) => {
    try {
      return await webviewFetch(url, init);
    } catch (error) {
      if (init.signal?.aborted || !hasTrustedCertificate(new URL(url).host)) {
        throw error;
      }
      return trustedFetch(url, init);
    }
  };
