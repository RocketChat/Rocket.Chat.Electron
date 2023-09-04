const fs = require('fs');

const jwt = require('jsonwebtoken');

const publicKey = fs.readFileSync('public.key', 'utf8');

const privateKey = fs.readFileSync('private.key', 'utf8');

// Sample supported versions data
const supportedVersionsData = {
  timestamp: '2023-07-12T00:00:00.000Z',
  i18n: {
    en: {
      message_token:
        'Your server is about to be deprecated. Please update to the latest version.',
    },
  },
  messages: [
    {
      remainingDays: 15,
      title: 'title',
      subtitle: 'subtitle',
      description: 'description',
      type: 'info',
      link: 'Docs page',
    },
  ],
  versions: [
    {
      version: '6.5.0',
      expiration: '2023-09-11T00:00:00.000Z',
    },
    {
      version: '6.4.0',
      expiration: '2023-08-11T00:00:00.000Z',
    },
  ],
};

// Function to generate and sign JWT using provided private key
function generateSignedJWT(payload, privateKey) {
  const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  return token;
}

const supportedVersionsToken = generateSignedJWT(
  supportedVersionsData,
  privateKey
);

fs.writeFileSync('supportedVersions.jwt', supportedVersionsToken);

console.log('Supported Versions JWT token generated and saved.');

// Verify the generated token using the public key
jwt.verify(
  supportedVersionsToken,
  publicKey,
  { algorithms: ['RS256'] },
  (err, decoded) => {
    if (err) {
      console.error('Error verifying JWT:', err.message);
    } else {
      console.log('JWT verified:', decoded);
    }
  }
);
