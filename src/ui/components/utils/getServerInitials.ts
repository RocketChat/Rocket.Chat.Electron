export const getServerInitials = (
  title: string | undefined,
  url: string
): string | undefined =>
  title
    ?.replace(url, new URL(url).hostname ?? '')
    ?.split(/[^A-Za-z0-9]+/g)
    ?.slice(0, 2)
    ?.map((text) => text.slice(0, 1).toUpperCase())
    ?.join('');
