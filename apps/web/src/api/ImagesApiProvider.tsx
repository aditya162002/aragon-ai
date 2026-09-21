import type { ReactNode } from 'react';
import type { ImagesApi } from './images-api';
import { ImagesApiContext } from './images-api-context';

interface ImagesApiProviderProps {
  api: ImagesApi;
  children: ReactNode;
}

/** Injects the images API into the component tree (the composition root decides the implementation). */
export function ImagesApiProvider({ api, children }: ImagesApiProviderProps) {
  return <ImagesApiContext value={api}>{children}</ImagesApiContext>;
}
