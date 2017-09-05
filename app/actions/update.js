export const UPDATE_AVAILABLE = 'UPDATE_AVAILABLE';
export const UPDATE_PROGRESS = 'UPDATE_PROGRESS';

export function updateAvailable(details) {
  return {
    type: UPDATE_AVAILABLE,
    details
  };
}

export function updateProgress(progress) {
  return {
    type: UPDATE_PROGRESS,
    progress
  };
}
