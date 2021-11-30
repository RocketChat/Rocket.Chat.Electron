import { useEffect, useRef, Ref } from 'react';

// TODO: Remove this interface or understand why they removed it https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1029
interface HTMLDialogElement extends HTMLElement {
  open: boolean;
  returnValue: string;
  close(returnValue?: string): void;
  show(): void;
  showModal(): void;
}

export const useDialog = (
  visible: boolean,
  onClose = (): void => undefined
): Ref<HTMLDialogElement> => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef<() => void>();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const onClose = onCloseRef.current;

    if (!dialog) {
      return;
    }

    if (!visible) {
      dialog.close();
      return;
    }

    dialog.showModal();

    dialog.onclose = () => {
      dialog.close();
      onClose?.();
    };

    dialog.onclick = ({ clientX, clientY }) => {
      const { left, top, width, height } = dialog.getBoundingClientRect();
      const isInDialog =
        top <= clientY &&
        clientY <= top + height &&
        left <= clientX &&
        clientX <= left + width;
      if (!isInDialog) {
        dialog.close();
      }
    };
  }, [visible]);

  return dialogRef;
};
