export function debounce<T extends (...params: any[]) => unknown>(
  cb: T,
  wait = 20
): T {
  let h: NodeJS.Timeout;
  const callable = (...args: any) => {
    clearTimeout(h);
    h = setTimeout(() => cb(...args), wait);
  };
  return <T>(<any>callable);
}
