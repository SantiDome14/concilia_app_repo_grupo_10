import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Dropzone from './Dropzone.vue';

function makeFile(name: string, type: string, size = 100): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

function buildDataTransfer(files: File[]): DataTransfer {
  // jsdom doesn't fully implement DataTransfer; we minimally satisfy what
  // Dropzone reads from the event.
  const items = files.map((file) => ({ kind: 'file', type: file.type }));
  return {
    files: files as unknown as FileList,
    items: items as unknown as DataTransferItemList,
  } as unknown as DataTransfer;
}

describe('Dropzone — form mode', () => {
  it('renders the default ARIA label and exposes role=button + tabindex=0', () => {
    const wrapper = mount(Dropzone);
    const dropArea = wrapper.find('[role="button"]');
    expect(dropArea.exists()).toBe(true);
    expect(dropArea.attributes('tabindex')).toBe('0');
    expect(dropArea.attributes('aria-label')).toContain('Arrastrá archivos');
  });

  it('emits update:modelValue with the dropped File in single mode', async () => {
    const wrapper = mount(Dropzone, { props: { multiple: false } });
    const dropped = makeFile('a.pdf', 'application/pdf');
    await wrapper
      .find('[role="button"]')
      .trigger('drop', { dataTransfer: buildDataTransfer([dropped]) });
    const events = wrapper.emitted('update:modelValue');
    expect(events).toBeTruthy();
    expect(events?.[0]?.[0]).toBeInstanceOf(File);
    expect((events?.[0]?.[0] as File).name).toBe('a.pdf');
  });

  it('emits update:modelValue with File[] in multiple mode', async () => {
    const wrapper = mount(Dropzone, { props: { multiple: true } });
    const f1 = makeFile('a.pdf', 'application/pdf');
    const f2 = makeFile('b.pdf', 'application/pdf');
    await wrapper
      .find('[role="button"]')
      .trigger('drop', { dataTransfer: buildDataTransfer([f1, f2]) });
    const events = wrapper.emitted('update:modelValue');
    const value = events?.[0]?.[0] as File[];
    expect(Array.isArray(value)).toBe(true);
    expect(value).toHaveLength(2);
  });

  it('rejects files failing the `accept` filter and emits `rejected`', async () => {
    const wrapper = mount(Dropzone, {
      props: { accept: ['application/pdf'] },
    });
    const png = makeFile('a.png', 'image/png');
    await wrapper
      .find('[role="button"]')
      .trigger('drop', { dataTransfer: buildDataTransfer([png]) });
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
    const rejected = wrapper.emitted('rejected');
    expect(rejected).toBeTruthy();
    const payload = rejected?.[0]?.[0] as { file: File; reason: string }[];
    expect(payload[0]?.file.name).toBe('a.png');
    expect(payload[0]?.reason).toContain('Tipo no permitido');
  });

  it('rejects files exceeding `maxSize`', async () => {
    const wrapper = mount(Dropzone, { props: { maxSize: 50 } });
    const big = makeFile('big.pdf', 'application/pdf', 500);
    await wrapper
      .find('[role="button"]')
      .trigger('drop', { dataTransfer: buildDataTransfer([big]) });
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
    expect(wrapper.emitted('rejected')).toBeTruthy();
  });

  it('caps multifile drops at `maxFiles` and rejects the overflow', async () => {
    const wrapper = mount(Dropzone, {
      props: { multiple: true, maxFiles: 1 },
    });
    const f1 = makeFile('a.pdf', 'application/pdf');
    const f2 = makeFile('b.pdf', 'application/pdf');
    await wrapper
      .find('[role="button"]')
      .trigger('drop', { dataTransfer: buildDataTransfer([f1, f2]) });
    const value = wrapper.emitted('update:modelValue')?.[0]?.[0] as File[];
    expect(value).toHaveLength(1);
    const rejected = wrapper.emitted('rejected')?.[0]?.[0] as { reason: string }[];
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toContain('Excede 1 archivos');
  });

  it('opens the file picker on Enter and on Space', async () => {
    const wrapper = mount(Dropzone);
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement;
    let clicks = 0;
    input.addEventListener('click', () => {
      clicks += 1;
    });
    await wrapper.find('[role="button"]').trigger('keydown', { key: 'Enter' });
    await wrapper.find('[role="button"]').trigger('keydown', { key: ' ' });
    expect(clicks).toBeGreaterThanOrEqual(2);
  });

  it('does not respond to drop / click / keys when disabled', async () => {
    const wrapper = mount(Dropzone, { props: { disabled: true } });
    const dropped = makeFile('a.pdf', 'application/pdf');
    await wrapper
      .find('[role="button"]')
      .trigger('drop', { dataTransfer: buildDataTransfer([dropped]) });
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
    expect(wrapper.find('[role="button"]').attributes('aria-disabled')).toBe('true');
  });
});

describe('Dropzone — eager-upload mode', () => {
  it('exposes an eager useFileUpload api when :options is provided', () => {
    const wrapper = mount(Dropzone, {
      props: {
        options: {
          presignEndpoint: '/p',
          confirmEndpoint: '/c',
        },
      },
    });
    // Vue Test Utils auto-unwraps the exposed ComputedRef.
    const exposed = (wrapper.vm as unknown as { eagerUpload: unknown }).eagerUpload;
    expect(exposed).toBeTruthy();
    expect(typeof (exposed as { start: unknown }).start).toBe('function');
  });

  it('does not instantiate useFileUpload when options is omitted', () => {
    const wrapper = mount(Dropzone);
    const exposed = (wrapper.vm as unknown as { eagerUpload: unknown }).eagerUpload;
    expect(exposed).toBeNull();
  });
});
