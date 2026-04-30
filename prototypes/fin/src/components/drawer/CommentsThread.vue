<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Comment } from '@/types/drawer';

// ════════════════════════════════════════════════════════════════════
// <CommentsThread> — Drawer comments section
// ────────────────────────────────────────────────────────────────────
// Renders root comments + level-1 replies (flat reply structure — no
// recursive nesting beyond depth 1). Each root comment exposes a
// "Responder" affordance that toggles a small inline composer; on
// submit, the parent emits `add` with `parent_id` set to the root id.
// The bottom composer always submits with `parent_id: null`.
//
// Textarea autosizes between 1 and 4 rows of content.
// Empty state shows "Sin comentarios" but keeps the bottom composer.
// ════════════════════════════════════════════════════════════════════

interface Props {
  comments: Comment[];
  currentUserId: string;
  /** Override `now` for deterministic rendering in tests. */
  now?: Date;
}

const props = withDefaults(defineProps<Props>(), {
  now: () => new Date(),
});

const emit = defineEmits<{
  add: [payload: { body: string; parent_id?: string | null }];
}>();

void props.currentUserId; // currently surfaced via author_name on each comment; kept for future "you wrote" affordance.

// ────────────────────────────────────────────────────────────────────
// Threading: split root comments from replies (one level deep).
// ────────────────────────────────────────────────────────────────────
const rootComments = computed(() =>
  props.comments.filter((c) => c.parent_id === null || c.parent_id === undefined),
);

const repliesByParent = computed(() => {
  const map = new Map<string, Comment[]>();
  for (const c of props.comments) {
    if (c.parent_id) {
      const list = map.get(c.parent_id);
      if (list) list.push(c);
      else map.set(c.parent_id, [c]);
    }
  }
  return map;
});

function repliesFor(rootId: string): Comment[] {
  return repliesByParent.value.get(rootId) ?? [];
}

// ────────────────────────────────────────────────────────────────────
// Composer state — root + per-root reply.
// ────────────────────────────────────────────────────────────────────
const rootBody = ref('');
const rootRef = ref<HTMLTextAreaElement | null>(null);

const replyOpenFor = ref<string | null>(null);
const replyBody = ref('');
// Refs scoped inside a v-for resolve to an array; we normalize via
// `resolveTextarea(...)` at every call site.
const replyRef = ref<HTMLTextAreaElement | HTMLTextAreaElement[] | null>(null);

function resolveTextarea(
  ref: HTMLTextAreaElement | HTMLTextAreaElement[] | null,
): HTMLTextAreaElement | null {
  // Refs declared inside a `v-for` resolve to an array even when only one
  // node renders (the reply composer is gated by v-if inside v-for).
  // Normalize both shapes to a single element.
  if (!ref) return null;
  if (Array.isArray(ref)) return ref[0] ?? null;
  return ref;
}

function autosize(el: HTMLTextAreaElement | HTMLTextAreaElement[] | null): void {
  const target = resolveTextarea(el);
  if (!target || typeof target.scrollHeight !== 'number') return;
  target.style.height = 'auto';
  // Cap to 4 rows worth (~24px line-height).
  const max = 24 * 4 + 16;
  const h = Math.min(target.scrollHeight, max);
  target.style.height = `${h}px`;
}

watch(rootBody, () => autosize(rootRef.value));
watch(replyBody, () => autosize(replyRef.value));

function submitRoot(): void {
  const body = rootBody.value.trim();
  if (!body) return;
  emit('add', { body, parent_id: null });
  rootBody.value = '';
  void nextTick(() => autosize(rootRef.value));
}

function toggleReply(rootId: string): void {
  if (replyOpenFor.value === rootId) {
    replyOpenFor.value = null;
    replyBody.value = '';
  } else {
    replyOpenFor.value = rootId;
    replyBody.value = '';
    void nextTick(() => {
      const target = resolveTextarea(replyRef.value);
      target?.focus();
      autosize(replyRef.value);
    });
  }
}

function submitReply(rootId: string): void {
  const body = replyBody.value.trim();
  if (!body) return;
  emit('add', { body, parent_id: rootId });
  replyBody.value = '';
  replyOpenFor.value = null;
}

// ────────────────────────────────────────────────────────────────────
// Time helpers.
// ────────────────────────────────────────────────────────────────────
function relativeTime(at: string): string {
  const date = safeParse(at);
  if (!date) return at;
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

function absoluteTime(at: string): string {
  const date = safeParse(at);
  if (!date) return at;
  return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
}

function safeParse(at: string): Date | null {
  try {
    const d = parseISO(at);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="comments-thread">
    <div
      v-if="rootComments.length === 0"
      class="rounded-md border border-b-2 bg-card-2 px-4 py-6 text-center text-sm text-t-3"
      data-testid="comments-empty"
    >
      Sin comentarios
    </div>

    <ul v-else class="flex flex-col gap-4" data-testid="comments-list">
      <li
        v-for="root in rootComments"
        :key="root.id"
        class="rounded-md border border-b-2 bg-card-2 p-3"
        data-testid="comment-root"
        :data-comment-id="root.id"
      >
        <div class="flex items-baseline gap-2">
          <span class="text-sm font-semibold text-t-1" data-testid="comment-author">
            {{ root.author_name }}
          </span>
          <span
            class="text-[11px] uppercase tracking-wide text-t-4"
            :title="absoluteTime(root.at)"
          >
            {{ relativeTime(root.at) }}
          </span>
        </div>
        <p class="mt-1 whitespace-pre-wrap text-sm text-t-2" data-testid="comment-body">
          {{ root.body }}
        </p>

        <!-- Replies (depth 1 only) -->
        <ul
          v-if="repliesFor(root.id).length > 0"
          class="mt-3 ml-4 flex flex-col gap-3 border-l border-b-2 pl-3"
          data-testid="comment-replies"
        >
          <li
            v-for="reply in repliesFor(root.id)"
            :key="reply.id"
            data-testid="comment-reply"
            :data-parent-id="root.id"
          >
            <div class="flex items-baseline gap-2">
              <span class="text-sm font-semibold text-t-1">{{ reply.author_name }}</span>
              <span
                class="text-[11px] uppercase tracking-wide text-t-4"
                :title="absoluteTime(reply.at)"
              >
                {{ relativeTime(reply.at) }}
              </span>
            </div>
            <p class="mt-1 whitespace-pre-wrap text-sm text-t-2">{{ reply.body }}</p>
          </li>
        </ul>

        <!-- Per-root reply affordance -->
        <div class="mt-2 flex items-center gap-2">
          <button
            type="button"
            class="text-[12px] font-medium text-t-3 hover:text-t-1 focus:outline-none focus-visible:underline"
            data-testid="comment-reply-toggle"
            @click="toggleReply(root.id)"
          >
            {{ replyOpenFor === root.id ? 'Cancelar' : 'Responder' }}
          </button>
        </div>

        <div
          v-if="replyOpenFor === root.id"
          class="mt-2 flex flex-col gap-2"
          data-testid="comment-reply-composer"
        >
          <textarea
            ref="replyRef"
            v-model="replyBody"
            rows="1"
            placeholder="Escribe una respuesta…"
            :class="
              cn(
                'w-full resize-none rounded-md border border-b-3 bg-[#111] px-3 py-2 text-sm text-t-1 placeholder:text-t-4 focus-visible:border-info focus-visible:outline-none',
              )
            "
            data-testid="comment-reply-textarea"
          />
          <div class="flex justify-end gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              :disabled="!replyBody.trim()"
              data-testid="comment-reply-submit"
              @click="submitReply(root.id)"
            >
              Comentar
            </Button>
          </div>
        </div>
      </li>
    </ul>

    <!-- Root composer (always visible, even on empty state) -->
    <div class="flex flex-col gap-2" data-testid="comments-composer">
      <textarea
        ref="rootRef"
        v-model="rootBody"
        rows="1"
        placeholder="Añade un comentario…"
        :class="
          cn(
            'w-full resize-none rounded-md border border-b-3 bg-[#111] px-3 py-2 text-sm text-t-1 placeholder:text-t-4 focus-visible:border-info focus-visible:outline-none',
          )
        "
        data-testid="comments-composer-textarea"
      />
      <div class="flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="sm"
          :disabled="!rootBody.trim()"
          data-testid="comments-composer-submit"
          @click="submitRoot"
        >
          Comentar
        </Button>
      </div>
    </div>
  </div>
</template>
