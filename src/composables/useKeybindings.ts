import { onBeforeUnmount, onMounted } from 'vue';
import { useCanvasStore } from '@/stores/canvas';

/**
 * Global keyboard shortcuts. Mirrors common Miro/Figma bindings.
 *  V select · H pan · N sticky · R rect · T text · P pen · A arrow
 *  Delete/Backspace remove · Cmd/Ctrl+Z undo · Shift+Cmd/Ctrl+Z redo
 *  0 reset zoom
 */
export function useKeybindings() {
  const store = useCanvasStore();

  function isEditableTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false;
    if (t.isContentEditable) return true;
    const tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA';
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isEditableTarget(e.target)) return;

    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
      return;
    }
    if (meta && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      store.selectMany(store.items.map((i) => i.id));
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (store.selectedIds.length) {
        e.preventDefault();
        store.removeItems(store.selectedIds);
      }
      return;
    }
    if (e.key === 'Escape') {
      store.clearSelection();
      store.setTool('select');
      return;
    }
    switch (e.key.toLowerCase()) {
      case 'v': store.setTool('select'); break;
      case 'h': store.setTool('pan'); break;
      case 'n': store.setTool('sticky'); break;
      case 'r': store.setTool('rect'); break;
      case 't': store.setTool('text'); break;
      case 'p': store.setTool('pen'); break;
      case 'a': store.setTool('arrow'); break;
      case '0': store.resetViewport(); break;
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
}
