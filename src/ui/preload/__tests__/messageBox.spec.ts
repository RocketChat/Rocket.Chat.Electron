/**
 * @jest-environment jsdom
 */
import { listenToMessageBoxEvents } from '../messageBox';

export {};

const dispatch = jest.fn();
const mockListen = jest.fn();
const addEventListener = jest.spyOn(document, 'addEventListener');

jest.mock('../../../store', () => ({
  dispatch: (...args: unknown[]) => dispatch(...args),
  listen: (...args: unknown[]) => mockListen(...args),
}));

describe('ui/preload/messageBox', () => {
  beforeEach(() => {
    dispatch.mockClear();
    mockListen.mockClear();
    addEventListener.mockClear();
  });

  it('registers required listeners', () => {
    listenToMessageBoxEvents();

    expect(addEventListener).toHaveBeenCalledWith(
      'focus',
      expect.any(Function),
      true
    );
    expect(addEventListener).toHaveBeenCalledWith(
      'blur',
      expect.any(Function),
      true
    );
    expect(mockListen).toHaveBeenCalledWith(
      'touch-bar/format-button-touched',
      expect.any(Function)
    );
  });

  it('dispatches focus and blur actions from matching events', () => {
    listenToMessageBoxEvents();
    const focusHandler = addEventListener.mock.calls.find(
      (call) => call[0] === 'focus'
    )?.[1] as EventListener;
    const blurHandler = addEventListener.mock.calls.find(
      (call) => call[0] === 'blur'
    )?.[1] as EventListener;

    const input = document.createElement('input');
    input.classList.add('js-input-message');
    focusHandler({ target: input } as unknown as FocusEvent);
    blurHandler({ target: input } as unknown as FocusEvent);

    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: 'webview/message-box-focused',
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: 'webview/message-box-blurred',
    });
  });

  it('dispatches a button click for focused message input', () => {
    const dialog = document.createElement('div');
    dialog.className = 'rc-message-box';

    const button = document.createElement('button');
    const click = jest.spyOn(button, 'click');
    button.setAttribute('data-id', 'bold');
    dialog.appendChild(button);

    const input = document.createElement('input');
    input.className = 'js-input-message';
    dialog.appendChild(input);
    document.body.appendChild(dialog);

    listenToMessageBoxEvents();
    const touchbarAction = mockListen.mock.calls[0]?.[1] as (_action: {
      payload: string;
    }) => void;
    const focusHandler = addEventListener.mock.calls.find(
      (call) => call[0] === 'focus'
    )?.[1] as EventListener;

    focusHandler({ target: input } as unknown as FocusEvent);
    touchbarAction({ payload: 'bold' });

    expect(click).toHaveBeenCalledTimes(1);
  });
});
