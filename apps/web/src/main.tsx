import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApiClient } from './api/api-client';
import { ImagesApiProvider } from './api/ImagesApiProvider';
import { App } from './App';
import { API, UI } from './constants';
import './index.css';

// Composition root: the only place that chooses concrete implementations.
const queryClient = new QueryClient();
const imagesApi = new ApiClient(API.BASE_PATH);

const rootElement = document.getElementById(UI.ROOT_ELEMENT_ID);
if (rootElement === null) throw new Error(`Missing #${UI.ROOT_ELEMENT_ID} element in index.html.`);

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ImagesApiProvider api={imagesApi}>
        <App />
      </ImagesApiProvider>
    </QueryClientProvider>
  </StrictMode>,
);
