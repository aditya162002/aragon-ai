import type { ImageDto, ImageListResponse } from '@aragon/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useImagesApi } from '../api/images-api-context';
import { QUERY } from '../constants';
import { pollIntervalFor, prependImage, removeImage } from '../lib/image-list-cache';

const selectItems = (list: ImageListResponse) => list.items;

/** The user's images, newest first. Polls while any image is still waiting for a verdict. */
export function useImages() {
  const api = useImagesApi();
  return useQuery({
    queryKey: QUERY.IMAGES_KEY,
    queryFn: () => api.listImages(),
    select: selectItems,
    refetchInterval: (query) => pollIntervalFor(query.state.data),
  });
}

/** Deletes an image, removing it from the cache immediately and rolling back if the request fails. */
export function useDeleteImage() {
  const api = useImagesApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => api.deleteImage(imageId),
    onMutate: async (imageId) => {
      await queryClient.cancelQueries({ queryKey: QUERY.IMAGES_KEY });
      const previous = queryClient.getQueryData<ImageListResponse>(QUERY.IMAGES_KEY);
      queryClient.setQueryData<ImageListResponse>(QUERY.IMAGES_KEY, (list) => removeImage(list, imageId));
      return { previous };
    },
    onError: (_error, _imageId, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY.IMAGES_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY.IMAGES_KEY }),
  });
}

/** Shows a freshly uploaded image right away, then refetches so polling picks it up. */
export function useInsertImage(): (image: ImageDto) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (image: ImageDto) => {
      queryClient.setQueryData<ImageListResponse>(QUERY.IMAGES_KEY, (list) => prependImage(list, image));
      void queryClient.invalidateQueries({ queryKey: QUERY.IMAGES_KEY });
    },
    [queryClient],
  );
}
