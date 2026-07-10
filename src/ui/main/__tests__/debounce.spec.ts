import { debounce } from '../debounce';

describe('ui/main/debounce', () => {
  it('delays callback execution until wait time passes', () => {
    jest.useFakeTimers();

    const callback = jest.fn();
    const debounced = debounce(callback, 100);

    debounced('hello');

    expect(callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(99);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('hello');

    jest.useRealTimers();
  });

  it('only invokes the latest call after repeated invocations', () => {
    jest.useFakeTimers();

    const callback = jest.fn();
    const debounced = debounce(callback, 40);

    debounced(1);
    debounced(2);
    debounced(3);

    jest.advanceTimersByTime(40);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(3);

    jest.useRealTimers();
  });

  it('uses the default wait when no timeout is provided', () => {
    jest.useFakeTimers();

    const callback = jest.fn();
    const debounced = debounce(callback);

    debounced('lazy');

    expect(callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(19);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledWith('lazy');

    jest.useRealTimers();
  });
});
