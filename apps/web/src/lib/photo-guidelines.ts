import { ACCEPTED_FORMATS_LABEL, MIN_RESOLUTION_LABEL } from './upload-rules';

export interface Guideline {
  title: string;
  detail: string;
}

/** Do's and don'ts mirror the checks the API runs (faces, blur, duplicates, resolution, format). */
export const PHOTO_DOS: readonly Guideline[] = [
  { title: 'Good lighting', detail: 'Face a window or soft light so your features are evenly lit.' },
  { title: 'Only you', detail: 'You should be the only person in the photo.' },
  { title: 'Close to the camera', detail: 'Your face clearly visible and filling a good part of the frame.' },
  { title: 'Sharp and in focus', detail: 'Hold the camera steady so your face is crisp.' },
  { title: 'Variety', detail: 'Different outfits, backgrounds and expressions — no near-duplicates.' },
  { title: 'Original files', detail: `${ACCEPTED_FORMATS_LABEL}, at least ${MIN_RESOLUTION_LABEL} on the short side.` },
];

export const PHOTO_DONTS: readonly Guideline[] = [
  { title: 'Group photos', detail: 'Other faces in the shot will get the photo rejected.' },
  { title: 'Blurry shots', detail: 'Motion blur or missed focus hides the details we need.' },
  { title: 'Far-away shots', detail: 'If your face is small in the frame, move closer.' },
  { title: 'Duplicates', detail: 'Near-identical photos add nothing new.' },
  { title: 'Screenshots or tiny images', detail: 'Low-resolution or heavily compressed files lose detail.' },
];
