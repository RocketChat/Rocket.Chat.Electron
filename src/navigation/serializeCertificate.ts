import type { Certificate } from 'electron';

// The value stored in `trustedCertificates` when the user trusts a
// certificate. Code that compares a certificate with that store must use it.
export const serializeCertificate = (certificate: Certificate): string =>
  `${certificate.issuerName}\n${certificate.data.toString()}`;
