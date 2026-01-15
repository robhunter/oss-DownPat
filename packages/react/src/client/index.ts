export {
  DownpatClient,
  createDownpatClient,
  type DownpatClientConfig,
  type ExerciseWithMetadata,
} from './DownpatClient.js';

export {
  initializeDownpat,
  getDownpatClient,
  updateDownpatToken,
  clearDownpat,
  isDownpatInitialized,
  type DownpatInitConfig,
} from './initialization.js';

export {
  DownpatProvider,
  DownpatContext,
  useDownpatClient,
  useDownpatToken,
  useHasDownpatContext,
  type DownpatProviderConfig,
} from './DownpatContext.js';
