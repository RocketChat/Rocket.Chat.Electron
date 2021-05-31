import { useDispatch } from 'react-redux';

import type { AppDispatch } from '../types/AppDispatch';

export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();
