import { useState, useEffect } from "react";
import {
  Home,
  Boxes,
  GitBranch,
  Compass,
  Rocket,
  Github,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  { href: "/", label: "首页", icon: Home, num: "01" },
  { href: "/modules", label: "模块详解", icon: Boxes, num: "02" },
  { href: "/dataflow", label: "数据流", icon: GitBranch, num: "03" },
  { href: "/decisions", label: "设计决策", icon: Compass, num: "04" },
  { href: "/quickstart", label: "快速上手", icon: Rocket, num: "05" },
];

interface Props {
  currentPath: string;
}

export default function Sidebar({ currentPath }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  const isActive = (href: string) =>
    href === "/" ? currentPath === "/" : currentPath.startsWith(href);

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-[var(--color-bg)]/90 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#818cf8] to-[#6366f1] flex items-center justify-center text-xs font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            M
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm tracking-tight">CodeMap</div>
            <div className="text-[10px] text-subtle font-mono">mastra/core</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-[var(--color-sidebar-bg)] border-r border-[var(--color-border)] z-30
          flex flex-col transition-transform duration-220 var(--ease-out-expo)
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="p-5 border-b border-[var(--color-border)]">
          <a href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-[#818cf8] to-[#6366f1] flex items-center justify-center text-sm font-bold text-white shadow-[0_0_24px_rgba(99,102,241,0.35)] group-hover:shadow-[0_0_32px_rgba(99,102,241,0.55)] transition-shadow">
              M
              <div className="absolute inset-0 rounded-lg ring-1 ring-white/20"></div>
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-[15px] tracking-tight">Mastra CodeMap</div>
              <div className="text-[10.5px] text-subtle font-mono mt-0.5">packages/core/src</div>
            </div>
          </a>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-[0.12em] text-subtle">
            Explorer
          </div>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-160
                  ${
                    active
                      ? "bg-[var(--color-primary-soft)] text-[var(--color-fg)] border border-[var(--color-border-primary)]"
                      : "text-muted hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-hover)] border border-transparent"
                  }`}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-[var(--color-primary)]" : ""} />
                <span className="flex-1 font-medium tracking-tight">{item.label}</span>
                <span className={`text-[10px] font-mono tabular-nums ${active ? "text-[var(--color-primary)]" : "text-subtle opacity-0 group-hover:opacity-100 transition-opacity"}`}>
                  {item.num}
                </span>
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--color-border)] space-y-2">
          <a
            href="https://github.com/mastra-ai/mastra"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <Github size={16} strokeWidth={1.8} />
            <span className="font-mono text-[12.5px]">mastra-ai/mastra</span>
          </a>
          <div className="px-3 py-1.5 text-[10px] text-subtle font-mono leading-relaxed border-t border-[var(--color-border)] pt-2.5">
            <div className="flex justify-between">
              <span>modules</span><span className="tabular-nums text-fg-muted">56</span>
            </div>
            <div className="flex justify-between">
              <span>core</span><span className="tabular-nums text-[var(--color-primary)]">8</span>
            </div>
            <div className="flex justify-between">
              <span>~LoC</span><span className="tabular-nums text-fg-muted">160k</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-20"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
