import { ref, type Ref } from 'vue';

// ════════════════════════════════════════════════════════════════════
// useSettingsDialog — module-singleton open/close state
// ────────────────────────────────────────────────────────────────────
// The dialog component is mounted once at the App.vue root. Any place
// in the tree (e.g. the Sidebar account menu) opens it via this
// composable so the dialog instance stays singleton — opening from
// multiple sites doesn't double-mount or fight for the overlay.
// ════════════════════════════════════════════════════════════════════

const isOpen: Ref<boolean> = ref(false);

export function useSettingsDialog() {
  return {
    isOpen,
    open(): void {
      isOpen.value = true;
    },
    close(): void {
      isOpen.value = false;
    },
    set(value: boolean): void {
      isOpen.value = value;
    },
  };
}
