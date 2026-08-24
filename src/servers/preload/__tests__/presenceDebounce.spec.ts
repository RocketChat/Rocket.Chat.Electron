import {
  createPresenceRateLimiter,
  shouldDebouncePresenceCall,
} from '../presenceDebounce';

describe('shouldDebouncePresenceCall', () => {
  it('drops a call arriving within the minimum interval of the previous call', () => {
    expect(shouldDebouncePresenceCall(1500, 1000, 1000)).toBe(true);
  });

  it('allows a call arriving exactly at the minimum interval', () => {
    expect(shouldDebouncePresenceCall(2000, 1000, 1000)).toBe(false);
  });

  it('allows a call arriving after the minimum interval', () => {
    expect(shouldDebouncePresenceCall(2500, 1000, 1000)).toBe(false);
  });

  it('allows the first call when no previous call has happened', () => {
    expect(shouldDebouncePresenceCall(Date.now(), 0, 1000)).toBe(false);
  });
});

describe('createPresenceRateLimiter', () => {
  const createFakeClock = (initialTime = 0) => {
    let currentTime = initialTime;
    const timers: { fn: () => void; at: number }[] = [];

    return {
      now: () => currentTime,
      schedule: (fn: () => void, ms: number) => {
        timers.push({ fn, at: currentTime + ms });
      },
      advance: (ms: number) => {
        currentTime += ms;
        const due = timers.filter((timer) => timer.at <= currentTime);
        due.forEach((timer) => {
          const index = timers.indexOf(timer);
          if (index !== -1) timers.splice(index, 1);
          timer.fn();
        });
      },
      pendingTimerCount: () => timers.length,
    };
  };

  it('sends the first request immediately', () => {
    const send = jest.fn();
    const clock = createFakeClock();
    const limiter = createPresenceRateLimiter({
      minIntervalMs: 1000,
      send,
      now: clock.now,
      schedule: clock.schedule,
    });

    limiter.request({ status: 'online' });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ status: 'online' });
  });

  it('coalesces two rapid requests into one deferred send carrying the last status', () => {
    const send = jest.fn();
    const clock = createFakeClock();
    const limiter = createPresenceRateLimiter({
      minIntervalMs: 1000,
      send,
      now: clock.now,
      schedule: clock.schedule,
    });

    limiter.request({ status: 'online' });
    send.mockClear();

    clock.advance(200);
    limiter.request({ status: 'away' });
    clock.advance(200);
    limiter.request({ status: 'busy' });

    expect(send).not.toHaveBeenCalled();

    clock.advance(600);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ status: 'busy' });
  });

  it('schedules only one timer for a burst of requests within the window', () => {
    const send = jest.fn();
    const clock = createFakeClock();
    const limiter = createPresenceRateLimiter({
      minIntervalMs: 1000,
      send,
      now: clock.now,
      schedule: clock.schedule,
    });

    limiter.request({ status: 'online' });

    clock.advance(100);
    limiter.request({ status: 'away' });
    expect(clock.pendingTimerCount()).toBe(1);

    clock.advance(100);
    limiter.request({ status: 'busy' });
    expect(clock.pendingTimerCount()).toBe(1);

    clock.advance(100);
    limiter.request({ status: 'offline' });
    expect(clock.pendingTimerCount()).toBe(1);
  });

  it('sends immediately after the window has elapsed with nothing pending', () => {
    const send = jest.fn();
    const clock = createFakeClock();
    const limiter = createPresenceRateLimiter({
      minIntervalMs: 1000,
      send,
      now: clock.now,
      schedule: clock.schedule,
    });

    limiter.request({ status: 'online' });
    send.mockClear();

    clock.advance(1000);
    limiter.request({ status: 'away' });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ status: 'away' });
  });

  it('results in exactly 2 sends for a burst of 3+ requests: first and last', () => {
    const send = jest.fn();
    const clock = createFakeClock();
    const limiter = createPresenceRateLimiter({
      minIntervalMs: 1000,
      send,
      now: clock.now,
      schedule: clock.schedule,
    });

    limiter.request({ status: 'online' });
    clock.advance(100);
    limiter.request({ status: 'away' });
    clock.advance(100);
    limiter.request({ status: 'busy' });
    clock.advance(100);
    limiter.request({ status: 'offline' });

    clock.advance(700);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenNthCalledWith(1, { status: 'online' });
    expect(send).toHaveBeenNthCalledWith(2, { status: 'offline' });
  });

  // REGRESSION GUARD: if the scheduled timer fires late, a request arriving
  // after the interval has technically elapsed must NOT take the immediate
  // path — it must still be captured as the pending call so the (still
  // pending) scheduled flush sends the newest status, not a stale one.
  it('sends the newest call, not a stale one, when a request arrives after the timer was due but before it fires', () => {
    const send = jest.fn();

    // A manual clock that lets time move forward WITHOUT auto-firing
    // scheduled timers, so a "late-firing timer" can be simulated: time
    // passes the deadline, a newer request arrives, and only THEN is the
    // scheduled callback invoked manually.
    let currentTime = 0;
    let scheduledFn: (() => void) | undefined;

    const limiter = createPresenceRateLimiter({
      minIntervalMs: 1000,
      send,
      now: () => currentTime,
      schedule: (fn) => {
        scheduledFn = fn;
      },
    });

    limiter.request({ status: 'online' });
    send.mockClear();

    currentTime += 100;
    limiter.request({ status: 'away' });

    expect(scheduledFn).toBeDefined();

    // Move time past the scheduled deadline without invoking the timer.
    currentTime += 1000;

    // A newer request arrives after the deadline has technically elapsed,
    // but the timer has not fired yet.
    limiter.request({ status: 'busy' });

    expect(send).not.toHaveBeenCalled();

    // Now let the (late) scheduled timer fire.
    scheduledFn?.();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ status: 'busy' });
  });

  it('calls onDeferred when a request is coalesced', () => {
    const send = jest.fn();
    const onDeferred = jest.fn();
    const clock = createFakeClock();
    const limiter = createPresenceRateLimiter({
      minIntervalMs: 1000,
      send,
      onDeferred,
      now: clock.now,
      schedule: clock.schedule,
    });

    limiter.request({ status: 'online' });
    clock.advance(100);
    limiter.request({ status: 'away' });

    expect(onDeferred).toHaveBeenCalledTimes(1);
    expect(onDeferred).toHaveBeenCalledWith({ status: 'away' });
  });
});
