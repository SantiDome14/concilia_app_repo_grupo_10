import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CommentsThread from './CommentsThread.vue';
import type { Comment } from '@/types/drawer';

function comment(
  id: string,
  body: string,
  parent_id: string | null = null,
  author_name = 'Alice',
): Comment {
  return {
    id,
    at: '2026-04-29T10:00:00',
    author_id: 'u1',
    author_name,
    body,
    parent_id,
  };
}

describe('CommentsThread', () => {
  it('renders the empty state but keeps the composer visible', () => {
    const wrapper = mount(CommentsThread, {
      props: { comments: [], currentUserId: 'u1' },
    });
    expect(wrapper.find('[data-testid="comments-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="comments-composer"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="comments-composer-textarea"]').exists()).toBe(true);
  });

  it('renders root comments', () => {
    const wrapper = mount(CommentsThread, {
      props: {
        comments: [
          comment('c1', 'Hola'),
          comment('c2', 'Mundo'),
        ],
        currentUserId: 'u1',
      },
    });

    const roots = wrapper.findAll('[data-testid="comment-root"]');
    expect(roots).toHaveLength(2);
    expect(roots[0]!.find('[data-testid="comment-body"]').text()).toBe('Hola');
    expect(roots[1]!.find('[data-testid="comment-body"]').text()).toBe('Mundo');
    // Empty state is hidden once we have comments.
    expect(wrapper.find('[data-testid="comments-empty"]').exists()).toBe(false);
  });

  it('renders replies (depth 1) under their root', () => {
    const wrapper = mount(CommentsThread, {
      props: {
        comments: [
          comment('c1', 'Pregunta'),
          comment('c2', 'Otro root'),
          comment('r1', 'Respuesta 1', 'c1', 'Bob'),
          comment('r2', 'Respuesta 2', 'c1', 'Carol'),
        ],
        currentUserId: 'u1',
      },
    });

    const roots = wrapper.findAll('[data-testid="comment-root"]');
    expect(roots).toHaveLength(2);

    const firstRootReplies = roots[0]!.findAll('[data-testid="comment-reply"]');
    expect(firstRootReplies).toHaveLength(2);
    expect(firstRootReplies[0]!.text()).toContain('Respuesta 1');
    expect(firstRootReplies[1]!.text()).toContain('Respuesta 2');

    // Second root has no replies.
    const secondRootReplies = roots[1]!.findAll('[data-testid="comment-reply"]');
    expect(secondRootReplies).toHaveLength(0);
  });

  it('emits add with parent_id null when the bottom composer submits', async () => {
    const wrapper = mount(CommentsThread, {
      props: { comments: [], currentUserId: 'u1' },
    });

    const textarea = wrapper.find('[data-testid="comments-composer-textarea"]');
    await textarea.setValue('Hola mundo');
    await wrapper.find('[data-testid="comments-composer-submit"]').trigger('click');

    const emitted = wrapper.emitted('add');
    expect(emitted).toBeTruthy();
    expect(emitted![0]).toEqual([{ body: 'Hola mundo', parent_id: null }]);
  });

  it('disables the bottom composer submit when the textarea is empty / whitespace', async () => {
    const wrapper = mount(CommentsThread, {
      props: { comments: [], currentUserId: 'u1' },
    });

    const submit = wrapper.find('[data-testid="comments-composer-submit"]');
    expect((submit.element as HTMLButtonElement).disabled).toBe(true);

    await wrapper.find('[data-testid="comments-composer-textarea"]').setValue('   ');
    expect((submit.element as HTMLButtonElement).disabled).toBe(true);

    await wrapper.find('[data-testid="comments-composer-textarea"]').setValue('hi');
    expect((submit.element as HTMLButtonElement).disabled).toBe(false);
  });

  it('toggles the per-root reply composer when "Responder" is clicked', async () => {
    const wrapper = mount(CommentsThread, {
      props: {
        comments: [comment('c1', 'Pregunta')],
        currentUserId: 'u1',
      },
    });

    expect(wrapper.find('[data-testid="comment-reply-composer"]').exists()).toBe(false);

    await wrapper.find('[data-testid="comment-reply-toggle"]').trigger('click');
    expect(wrapper.find('[data-testid="comment-reply-composer"]').exists()).toBe(true);

    await wrapper.find('[data-testid="comment-reply-toggle"]').trigger('click');
    expect(wrapper.find('[data-testid="comment-reply-composer"]').exists()).toBe(false);
  });

  it('emits add with parent_id set to the root id when the reply composer submits', async () => {
    const wrapper = mount(CommentsThread, {
      props: {
        comments: [comment('c1', 'Pregunta'), comment('c2', 'Otro')],
        currentUserId: 'u1',
      },
    });

    // Open the reply composer on the first root.
    const roots = wrapper.findAll('[data-testid="comment-root"]');
    await roots[0]!.find('[data-testid="comment-reply-toggle"]').trigger('click');

    const replyTextarea = roots[0]!.find('[data-testid="comment-reply-textarea"]');
    await replyTextarea.setValue('Respondo a c1');
    await roots[0]!.find('[data-testid="comment-reply-submit"]').trigger('click');

    const emitted = wrapper.emitted('add');
    expect(emitted).toBeTruthy();
    expect(emitted![0]).toEqual([{ body: 'Respondo a c1', parent_id: 'c1' }]);
  });

  it('clears the bottom composer textarea after a successful submit', async () => {
    const wrapper = mount(CommentsThread, {
      props: { comments: [], currentUserId: 'u1' },
    });

    const textarea = wrapper.find('[data-testid="comments-composer-textarea"]');
    await textarea.setValue('something');
    await wrapper.find('[data-testid="comments-composer-submit"]').trigger('click');

    expect((textarea.element as HTMLTextAreaElement).value).toBe('');
  });

  it('does not emit add when the composer body is whitespace only', async () => {
    const wrapper = mount(CommentsThread, {
      props: { comments: [], currentUserId: 'u1' },
    });

    const textarea = wrapper.find('[data-testid="comments-composer-textarea"]');
    await textarea.setValue('   ');
    // Click is gated by the disabled attribute, but call submit directly to
    // be defensive — emit must still NOT fire.
    await wrapper.find('[data-testid="comments-composer-submit"]').trigger('click');

    expect(wrapper.emitted('add')).toBeFalsy();
  });
});
