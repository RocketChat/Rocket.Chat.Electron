export const validateVideoCallUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);

    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      throw new Error(
        `Invalid URL protocol: ${parsedUrl.protocol}. Only http: and https: are allowed.`
      );
    }

    return parsedUrl.href;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid URL format: ${url}`);
    }
    throw error;
  }
};
