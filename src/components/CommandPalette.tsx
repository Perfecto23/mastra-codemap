import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Search,
  FileCode,
  Boxes,
  GitBranch,
  Compass,
  Home,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { CORE_MODULES } from "../data/modules";
import { DECISIONS } from "../data/decisions";

interface SearchItem {
  id: string;
  label: string;
  hint?: string;
  category: "page" | "module" | "decision";
  href: string;
  icon: typeof Search;
}

const PAGES: SearchItem[] = [
  { id: "page-home", label: "首页", category: "page", href: "/", icon: Home },
  { id: "page-modules", label: "模块详解", category: "page", href: "/modules", icon: Boxes },
  { id: "page-dataflow", label: "数据流 · agent.generate()", category: "page", href: "/dataflow", icon: GitBranch },
  { id: "page-decisions", label: "设计决策", category: "page", href: "/decisions", icon: Compass },
];

const MODULES: SearchItem[] = CORE_MODULES.map((m) => ({
  id: `module-${m.id}`,
  label: `${m.name}/`,
  hint: m.role.slice(0, 60) + (m.role.length > 60 ? "…" : ""),
  category: "module" as const,
  href: `/modules#module-${m.id}`,
  icon: FileCode,
}));

const DECISION_ITEMS: SearchItem[] = DECISIONS.map((d) => ({
  id: `decision-${d.id}`,
  label: d.title,
  hint: d.context.slice(0, 70) + (d.context.length > 70 ? "…" : ""),
  category: "decision" as const,
  href: `/decisions#${d.id}`,
  icon: Compass,
}));

const ALL_ITEMS: SearchItem[] = [...PAGES, ...MODULES, ...DECISION_ITEMS];

const CATEGORY_LABEL: Record<SearchItem["category"], string> = {
  page: "页面",
  module: "Core 模块",
  decision: "设计决策",
};

/** Simple substring scoring: earlier / more matches rank higher. */
function score(item: SearchItem, q: string): number {
  if (!q) return 0;
  const hay = (item.label + " " + (item.hint ?? "") + " " + item.id).toLowerCase();
  const needle = q.toLowerCase();
  if (!hay.includes(needle)) return -1;
  // Prefer label matches over hint matches; prefer shorter labels (exact-ish)
  const labelIdx = item.label.toLowerCase().indexOf(needle);
  let s = 100 - (labelIdx === -1 ? 50 : labelIdx);
  s -= item.label.length * 0.2;
  return s;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return ALL_ITEMS;
    return ALL_ITEMS.map((it) => ({ it, s: score(it, q) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.it);
  }, [query]);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const navigate = useCallback(
    (href: string) => {
      closePalette();
      window.location.href = href;
    },
    [closePalette]
  );

  // Keyboard shortcut: Cmd/Ctrl+K  +  programmatic open via custom event
  useEffect(() => {
    const openHandler = () => {
      setOpen(true);
      setQuery("");
      setSelectedIndex(0);
    };
    const keydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        if (!open) {
          setQuery("");
          setSelectedIndex(0);
        }
      }
      if (e.key === "Escape" && open) closePalette();
    };
    document.addEventListener("cmdk:open", openHandler);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("cmdk:open", openHandler);
      document.removeEventListener("keydown", keydown);
    };
  }, [open, closePalette]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 15);
  }, [open]);

  // Clamp selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % Math.max(filtered.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      navigate(filtered[selectedIndex].href);
    }
  };

  if (!open) return null;

  // Group results by category (only show categories that have matches)
  const groups: { category: SearchItem["category"]; items: SearchItem[] }[] = [];
  (["page", "module", "decision"] as const).forEach((cat) => {
    const items = filtered.filter((it) => it.category === cat);
    if (items.length) groups.push({ category: cat, items });
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[16vh] px-4"
      onClick={closePalette}
      role="dialog"
      aria-modal="true"
      aria-label="全局搜索"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-xl bg-[var(--color-bg-elevated)] rounded-xl shadow-2xl border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-[var(--color-border)]">
          <Search size={16} strokeWidth={2} className="text-[var(--color-fg-subtle)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索模块、页面、设计决策…"
            className="flex-1 py-3.5 text-[14px] bg-transparent outline-none text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)]"
            aria-label="搜索输入"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-fg-subtle)] bg-[var(--color-code-bg)] border border-[var(--color-border)] rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--color-fg-subtle)]">
              没有匹配 “{query}” 的结果
            </div>
          )}
          {groups.map((g) => {
            // Compute flat index offset so Arrow keys work across groups
            const beforeCount = groups
              .slice(0, groups.indexOf(g))
              .reduce((n, x) => n + x.items.length, 0);
            return (
              <div key={g.category} className="px-2">
                <div className="px-3 pt-2 pb-1 text-[10.5px] font-mono uppercase tracking-[0.1em] text-[var(--color-fg-subtle)]">
                  {CATEGORY_LABEL[g.category]}
                </div>
                {g.items.map((item) => {
                  const flatIdx = beforeCount + g.items.indexOf(item);
                  const isSelected = flatIdx === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(flatIdx)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                        isSelected
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-fg)]"
                          : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hover)]"
                      }`}
                      onClick={() => navigate(item.href)}
                    >
                      <Icon
                        size={15}
                        strokeWidth={1.8}
                        className={isSelected ? "text-[var(--color-primary)]" : "text-[var(--color-fg-subtle)]"}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-medium tracking-tight truncate">
                          {item.label}
                        </div>
                        {item.hint && (
                          <div className="text-[11.5px] text-[var(--color-fg-subtle)] truncate leading-snug">
                            {item.hint}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2.5 border-t border-[var(--color-border)] flex items-center justify-end gap-3 text-[11px] text-[var(--color-fg-subtle)]">
          <span className="flex items-center gap-1">
            <ArrowUp size={11} />
            <ArrowDown size={11} />
            导航
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft size={11} />
            跳转
          </span>
        </div>
      </div>
    </div>
  );
}
