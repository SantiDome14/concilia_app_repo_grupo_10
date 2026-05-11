import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FileUploadProgress from './FileUploadProgress.vue';
import type { UploadFile } from '@/types/file-upload';
import { ApiError } from '@/types/api';

let _id = 0;
function makeUploadFile(overrides: Partial<UploadFile> = {}): UploadFile {
  _id += 1;
  const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
  return {
    id: `f-${_id}`,
    file,
    filename: 'doc.pdf',
    sizeBytes: 1_500_000,
    contentType: 'application/pdf',
    state: 'idle',
    bytesLoaded: 0,
    bytesTotal: 1_500_000,
    percent: 0,
    key: null,
    etag: null,
    confirmedAt: null,
    lastError: null,
    retryCount: 0,
    ...overrides,
  };
}

describe('FileUploadProgress', () => {
  it('renders the EmptyState when files is empty', () => {
    const wrapper = mount(FileUploadProgress, { props: { files: [] } });
    expect(wrapper.text()).toContain('Aún no hay archivos en cola');
    expect(wrapper.find('ul[role="list"]').exists()).toBe(false);
  });

  it('renders the custom emptyMessage when provided', () => {
    const wrapper = mount(FileUploadProgress, {
      props: { files: [], emptyMessage: 'No hay quotes en el período' },
    });
    expect(wrapper.text()).toContain('No hay quotes en el período');
  });

  it('shows the progress bar only while a file is uploading', () => {
    const files: UploadFile[] = [
      makeUploadFile({ state: 'uploading', percent: 60 }),
      makeUploadFile({ state: 'completed', percent: 100 }),
    ];
    const wrapper = mount(FileUploadProgress, { props: { files } });
    const bars = wrapper.findAll('[role="progressbar"]');
    expect(bars).toHaveLength(1);
    expect(bars[0]?.attributes('aria-valuenow')).toBe('60');
  });

  it('shows the Retry button only on error state and emits retry(fileId)', async () => {
    const errored = makeUploadFile({
      state: 'error',
      lastError: new ApiError('boom', 502, 'HTTP_502'),
    });
    const wrapper = mount(FileUploadProgress, { props: { files: [errored] } });
    const retryBtn = wrapper.find(`[aria-label="Reintentar ${errored.filename}"]`);
    expect(retryBtn.exists()).toBe(true);
    await retryBtn.trigger('click');
    expect(wrapper.emitted('retry')?.[0]?.[0]).toBe(errored.id);
  });

  it('shows the Cancel button while uploading and emits cancel(fileId)', async () => {
    const inFlight = makeUploadFile({ state: 'uploading', percent: 30 });
    const wrapper = mount(FileUploadProgress, { props: { files: [inFlight] } });
    const cancelBtn = wrapper.find(`[aria-label="Cancelar ${inFlight.filename}"]`);
    expect(cancelBtn.exists()).toBe(true);
    await cancelBtn.trigger('click');
    expect(wrapper.emitted('cancel')?.[0]?.[0]).toBe(inFlight.id);
  });

  it('does not render Retry / Cancel for completed or cancelled files', () => {
    const completed = makeUploadFile({ state: 'completed' });
    const cancelled = makeUploadFile({ state: 'cancelled' });
    const wrapper = mount(FileUploadProgress, {
      props: { files: [completed, cancelled] },
    });
    expect(wrapper.find(`[aria-label="Reintentar ${completed.filename}"]`).exists()).toBe(false);
    expect(wrapper.find(`[aria-label="Cancelar ${cancelled.filename}"]`).exists()).toBe(false);
  });

  it('renders the error message inline when state is error', () => {
    const errored = makeUploadFile({
      state: 'error',
      lastError: new ApiError('Excede el tamaño', 413, 'FILE_TOO_LARGE'),
    });
    const wrapper = mount(FileUploadProgress, { props: { files: [errored] } });
    expect(wrapper.text()).toContain('Excede el tamaño');
  });
});
