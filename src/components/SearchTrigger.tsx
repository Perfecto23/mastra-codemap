import { Search } from "lucide-react";

function openPalette() {
  document.dispatchEvent(new Event("cmdk:open"));
}

/** Compact icon-only button for the mobile top bar. */
export function MobileSearchButton() {
  return (
    <button
      type="button"
      onClick={openPalette}
      className="p-2 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-fg-muted)]"
      aria-label="搜索 (⌘K)"
    >
      <Search size={18} strokeWidth={2} />
    </button>
  );
}

/**
 * Desktop top-right trigger — looks like a command-palette affordance:
 * rounded search bar with icon + "搜索..." + ⌘K kbd. Fixed position so it's
 * always one reach away without taking space in the layout.
 */
export function DesktopSearchTrigger() {
  return (
    <button
      type="button"
      onClick={openPalette}
      className="hidden lg:flex fixed top-4 right-5 z-30 items-center gap-2.5 h-9 pl-3 pr-2 rounded-lg
        bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)]
        hover:bg-[var(--color-surface-hover)] transition-all shadow-sm
        text-[13px] text-[var(--color-fg-subtle)] group"
      aria-label="搜索模块、页面、决策 (⌘K)"
    >
      <Search size={14} strokeWidth={2.2} className="text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg-muted)] transition-colors" />
      <span className="w-28 text-left tracking-tight">搜索…</span>
      <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10.5px] font-mono text-[var(--color-fg-subtle)] bg-[var(--color-code-bg)] border border-[var(--color-border)] rounded">
        ⌘K
      </kbd>
    </button>
  );
}
