import type { ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { cx } from '../lib/cx';
import { ACCEPTED_FORMATS_LABEL, DROPZONE_ACCEPT, MAX_FILE_SIZE_LABEL } from '../lib/upload-rules';
import { UploadIcon } from './icons';

interface PhotoDropzoneProps {
  onFiles: (files: readonly File[]) => void;
  /** Photos being uploaded/checked, shown inside the box right where they were chosen. */
  children?: ReactNode;
}

/**
 * Drop target plus a real "Choose photos" button (keyboard accessible). Every file is passed on,
 * including ones react-dropzone considers unacceptable: our own validation explains *why* a file
 * can't be used instead of silently dropping it.
 */
export function PhotoDropzone({ onFiles, children }: PhotoDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: DROPZONE_ACCEPT,
    noClick: true,
    noKeyboard: true,
    onDrop: (acceptedFiles, fileRejections) => onFiles([...acceptedFiles, ...fileRejections.map(({ file }) => file)]),
  });

  return (
    <div
      {...getRootProps({
        className: cx(
          'relative flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-12',
          isDragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/70 hover:border-slate-400',
        ),
      })}
    >
      <input {...getInputProps()} />
      <div
        className={cx(
          'flex size-12 items-center justify-center rounded-2xl shadow-sm ring-1 transition-colors',
          isDragActive ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-brand-600 ring-slate-200',
        )}
      >
        <UploadIcon className="size-6" />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-900">
        {isDragActive ? 'Drop your photos to upload' : 'Drag and drop your photos here'}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {ACCEPTED_FORMATS_LABEL} · up to {MAX_FILE_SIZE_LABEL} each
      </p>
      <button
        type="button"
        onClick={open}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        Choose photos
      </button>
      {children && <div className="mt-8 w-full text-left">{children}</div>}
    </div>
  );
}
