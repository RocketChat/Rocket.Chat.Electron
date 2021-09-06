export function debounce<T extends (...params: any[]) => unknown>(
  cb: T,
  wait = 20
): T {
  let h: ReturnType<typeof setTimeout> | undefined;
  const callable = (...args: any) => {
    h && clearTimeout(h);
    h = setTimeout(() => cb(...args), wait);
  };
  return <T>(<any>callable);
}
