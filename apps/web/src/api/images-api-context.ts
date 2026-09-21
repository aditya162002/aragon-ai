import { createContext, use } from 'react';
import type { ImagesApi } from './images-api';

/** Carries the injected `ImagesApi`; provided by `ImagesApiProvider` at the composition root. */
export const ImagesApiContext = createContext<ImagesApi | null>(null);

export function useImagesApi(): ImagesApi {
  const api = use(ImagesApiContext);
  if (api === null) throw new Error('useImagesApi must be used inside <ImagesApiProvider>.');
  return api;
}
