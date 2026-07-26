import { useEffect, useRef, useState, useCallback } from "react";
import { Search, FileCode, Boxes, GitBranch, Compass, Home } from "lucide-react";
import { CORE_MODULES } from "../data/modules";

interface SearchItem {
  id: string;
  label: string;
  category: "page" | "module";
  href: string;
  icon: typeof Search;
}

const PAGES: SearchItem[] = [
  { id: "page-home", label: "首页", category: "page", href: "/", icon: Home },
  { id: "page-modules", label: "模块详解", category: "page", href: "/modules", icon: Boxes },
  { id: "page-dataflow", label: "数据流", category: "page", href: "/dataflow", icon: GitBranch },
  { id: "page-decisions", label: "设计决策", category: "page", href: "/decisions", icon: Compass },
];

const MODULES: SearchItem[] = CORE_MODULES.map((m) => ({
  id: `module-${m.id}`,
  label: `${m.name}/`,
  category: "module" as const,
  href: `/modules#module-${m.id}`,
  icon: FileCode,
}));

const ALL_ITEMS: SearchItem[] = [...PAGES, ...MODULES];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const filtered = query.trim()
    ? ALL_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.id.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_ITEMS;

  // PLACEHOLDER_REST

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const navigate = useCallback((href: string) => {
    closePalette();
    window.location.href = href;
  }, [closePalette]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) closePalette();
        else openPalette();
      }
      if (e.key === "Escape" && open) {
        closePalette();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, openPalette, closePalette]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // PLACEHOLDER_KEYBOARD

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      navigate(filtered[selectedIndex].href);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={closePalette}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-[var(--color-border)]">
          <Search size={16} className="text-[var(--color-fg-subtle)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索模块或页面..."
            className="flex-1 py-3.5 text-[14px] bg-transparent outline-none text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)]"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-fg-subtle)] bg-[var(--color-code-bg)] border border-[var(--color-border)] rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px] text-[var(--color-fg-subtle)]">
              没有匹配结果
            </div>
          )}
          {filtered.map((item, i) => {
            const Icon = item.icon;
            const isSelected = i === selectedIndex;
            return (
              <button
                key={item.id}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13.5px] transition-colors ${
                  isSelected
                    ? "bg-[var(--color-primary-soft)] text-[var(--color-fg)]"
                    : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hover)]"
                }`}
                onClick={() => navigate(item.href)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <Icon
                  size={15}
                  strokeWidth={1.8}
                  className={isSelected ? "text-[var(--color-primary)]" : "text-[var(--color-fg-subtle)]"}
                />
                <span className="flex-1 font-medium tracking-tight">{item.label}</span>
                <span className="text-[10px] font-mono text-[var(--color-fg-subtle)] uppercase">
                  {item.category === "page" ? "页面" : "模块"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center gap-4 text-[10.5px] text-[var(--color-fg-subtle)]">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[var(--color-code-bg)] border border-[var(--color-border)] rounded font-mono">↑↓</kbd>
            导航
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[var(--color-code-bg)] border border-[var(--color-border)] rounded font-mono">↵</kbd>
            跳转
          </span>
        </div>
      </div>
    </div>
  );
}