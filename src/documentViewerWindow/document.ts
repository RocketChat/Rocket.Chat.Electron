export type DocumentDescriptor = {
  url: string;
  format: string;
  partition: string;
  server: string;
};

const EMPTY: DocumentDescriptor = {
  url: '',
  format: '',
  partition: '',
  server: '',
};

/**
 * The document the window was opened on, encoded in the page URL by the main
 * process so the first paint already has it. A window that is already open is
 * handed the next one over IPC instead.
 */
export const readInitialDocument = (): DocumentDescriptor => {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      url: params.get('url') ?? '',
      format: params.get('format') ?? '',
      partition: params.get('partition') ?? '',
      server: params.get('server') ?? '',
    };
  } catch {
    return EMPTY;
  }
};
