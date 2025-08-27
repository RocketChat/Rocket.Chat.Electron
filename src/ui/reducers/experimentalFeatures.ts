import type { AnyAction } from 'redux';

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
    features: MemoryFeatures;
    metrics?: MemoryMetrics;
  };
}

// Action types
export const EXPERIMENTAL_MEMORY_IMPROVEMENTS_TOGGLED = 'experimental/memory-improvements-toggled';
export const EXPERIMENTAL_MEMORY_FEATURE_TOGGLED = 'experimental/memory-feature-toggled';
export const EXPERIMENTAL_MEMORY_METRICS_UPDATED = 'experimental/memory-metrics-updated';

const initialState: ExperimentalFeaturesState = {
  memoryImprovements: {
    enabled: false,
    features: {
      monitoring: false,
      smartCleanup: false,
      autoReload: false,
      domOptimization: false,
      websocket: false,
    },
  },
};

export const experimentalFeaturesReducer = (
  state = initialState,
  action: AnyAction
): ExperimentalFeaturesState => {
  switch (action.type) {
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
      return {
        ...state,
        memoryImprovements: {
          ...state.memoryImprovements,
          features: {
            ...state.memoryImprovements.features,
            [action.payload.feature]: action.payload.enabled,
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