import type { AnyAction, Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import {
  EXPERIMENTAL_MEMORY_IMPROVEMENTS_TOGGLED,
  EXPERIMENTAL_MEMORY_FEATURE_TOGGLED,
  EXPERIMENTAL_MEMORY_METRICS_UPDATED,
} from '../actions';

export interface MemoryFeatures {
  monitoring: boolean;
  smartCleanup: boolean;
  autoReload: boolean;
  domOptimization: boolean;
  websocket: boolean;
}

export interface MemoryMetrics {
  memorySaved: number;
  interventions: number;
  lastCleanup: number;
}

export interface ExperimentalFeaturesState {
  memoryImprovements: {
    enabled: boolean;
    showStatusBar: boolean;
    features: MemoryFeatures;
    metrics?: MemoryMetrics;
  };
}

const initialState: ExperimentalFeaturesState = {
  memoryImprovements: {
    enabled: false,
    showStatusBar: false,
    features: {
      monitoring: false,
      smartCleanup: false,
      autoReload: false,
      domOptimization: false,
      websocket: false,
    },
  },
};

export const experimentalFeaturesReducer: Reducer<
  ExperimentalFeaturesState,
  AnyAction | ActionOf<typeof APP_SETTINGS_LOADED>
> = (state = initialState, action): ExperimentalFeaturesState => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      return {
        ...state,
        memoryImprovements: action.payload.experimentalMemoryImprovements || initialState.memoryImprovements,
      };
    }
    case EXPERIMENTAL_MEMORY_IMPROVEMENTS_TOGGLED: {
      const enabled = action.payload.enabled;
      return {
        ...state,
        memoryImprovements: {
          ...state.memoryImprovements,
          enabled,
          // Keep individual feature states unchanged
          // If disabling master, all features will be disabled in practice
          // but their toggle states are preserved for when re-enabled
          features: enabled ? state.memoryImprovements.features : {
            monitoring: false,
            smartCleanup: false,
            autoReload: false,
            domOptimization: false,
            websocket: false,
          },
        },
      };
    }

    case EXPERIMENTAL_MEMORY_FEATURE_TOGGLED: {
      const { feature, enabled } = action.payload;
      
      // Handle showStatusBar separately as it's not a feature
      if (feature === 'showStatusBar') {
        return {
          ...state,
          memoryImprovements: {
            ...state.memoryImprovements,
            showStatusBar: enabled,
          },
        };
      }
      
      return {
        ...state,
        memoryImprovements: {
          ...state.memoryImprovements,
          features: {
            ...state.memoryImprovements.features,
            [feature]: enabled,
          },
        },
      };
    }

    case EXPERIMENTAL_MEMORY_METRICS_UPDATED: {
      return {
        ...state,
        memoryImprovements: {
          ...state.memoryImprovements,
          metrics: action.payload,
        },
      };
    }

    default:
      return state;
  }
};