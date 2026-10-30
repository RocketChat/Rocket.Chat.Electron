import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';

// A self-signed certificate for 127.0.0.1, made at test time, so no private
// key is kept in the repository. Node has no API that makes a certificate,
// so this writes the DER of a minimal X.509 v3 certificate: an EC P-256 key,
// an ECDSA SHA-256 signature and an IP subject alternative name.

const lengthOf = (length: number): Buffer => {
  if (length < 0x80) return Buffer.from([length]);
  if (length < 0x100) return Buffer.from([0x81, length]);
  return Buffer.from([0x82, length >> 8, length & 0xff]);
};

const tlv = (tag: number, ...parts: Buffer[]): Buffer => {
  const body = Buffer.concat(parts);
  return Buffer.concat([Buffer.from([tag]), lengthOf(body.length), body]);
};

const sequence = (...parts: Buffer[]) => tlv(0x30, ...parts);

const objectId = (dotted: string): Buffer => {
  const [first, second, ...rest] = dotted.split('.').map(Number);
  const bytes = [first * 40 + second];
  for (const arc of rest) {
    const groups = [arc & 0x7f];
    for (let value = arc >> 7; value > 0; value >>= 7) {
      groups.unshift((value & 0x7f) | 0x80);
    }
    bytes.push(...groups);
  }
  return tlv(0x06, Buffer.from(bytes));
};

const utcTime = (date: Date) =>
  tlv(
    0x17,
    Buffer.from(
      `${date.toISOString().slice(2, 19).replace(/[-T:]/g, '')}Z`,
      'ascii'
    )
  );

const commonName = (name: string) =>
  sequence(
    tlv(0x31, sequence(objectId('2.5.4.3'), tlv(0x0c, Buffer.from(name))))
  );

export const createSelfSignedCertificate = (
  name: string
): { key: string; cert: string } => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const ecdsaWithSha256 = sequence(objectId('1.2.840.10045.4.3.2'));
  const serial = randomBytes(8);
  serial[0] = (serial[0] & 0x7f) | 0x01;
  const now = Date.now();
  const subjectAltName = sequence(
    objectId('2.5.29.17'),
    tlv(0x04, sequence(tlv(0x87, Buffer.from([127, 0, 0, 1]))))
  );
  const toBeSigned = sequence(
    tlv(0xa0, tlv(0x02, Buffer.from([2]))),
    tlv(0x02, serial),
    ecdsaWithSha256,
    commonName(name),
    sequence(
      utcTime(new Date(now - 60 * 60 * 1000)),
      utcTime(new Date(now + 24 * 60 * 60 * 1000))
    ),
    commonName(name),
    publicKey.export({ type: 'spki', format: 'der' }),
    tlv(0xa3, sequence(subjectAltName))
  );
  const signature = sign('sha256', toBeSigned, privateKey);
  const der = sequence(
    toBeSigned,
    ecdsaWithSha256,
    tlv(0x03, Buffer.from([0]), signature)
  );
  const base64Lines = der.toString('base64').match(/.{1,64}/g) ?? [];
  return {
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    cert: `-----BEGIN CERTIFICATE-----\n${base64Lines.join('\n')}\n-----END CERTIFICATE-----\n`,
  };
};
