import { useEffect, useRef, useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, FileCode, Package, Link2, BookOpen, Sparkles, FolderOpen, Code2, GitFork } from "lucide-react";
import type { CoreModule } from "../data/types";

interface Props {
  module: CoreModule;
  defaultOpen?: boolean;
}

const KIND_LABEL: Record<CoreModule["keyExports"][number]["kind"], string> = {
  class: "class",
  function: "fn",
  type: "type",
  interface: "iface",
  const: "const",
};

export default function ModuleCard({ module, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(defaultOpen ? "auto" : 0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-open when mermaid clicks this module
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handler = () => {
      setOpen(true);
      setTimeout(() => {
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    };
    card.addEventListener("mermaid:activate", handler);
    return () => card.removeEventListener("mermaid:activate", handler);
  }, []);

  // Open when URL hash matches on load
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === `#module-${module.id}`) {
      setTimeout(() => setOpen(true), 100);
    }
  }, [module.id]);

  // Animate height
  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      const h = contentRef.current.scrollHeight;
      setHeight(h);
      const t = setTimeout(() => setHeight("auto"), 240);
      return () => clearTimeout(t);
    } else {
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight);
        requestAnimationFrame(() => setHeight(0));
      }
    }
  }, [open]);

  return (
    <div
      ref={cardRef}
      id={`module-${module.id}`}
      data-module-card={module.id}
      className="card overflow-hidden group transition-shadow data-[highlight=true]:shadow-[0_0_0_1px_var(--color-primary),0_8px_32px_-8px_rgba(99,102,241,0.3)]"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5 lg:p-6 flex items-start gap-4 hover:bg-[var(--color-surface-hover)] transition-colors"
        aria-expanded={open}
        aria-controls={`module-panel-${module.id}`}
      >
        <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-border-primary)] flex items-center justify-center">
          <Package size={16} className="text-[var(--color-primary)]" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-mono text-[15.5px] font-semibold text-[var(--color-fg)] tracking-tight">
              {module.name}
              <span className="text-[var(--color-primary)] font-normal">/</span>
            </h3>
            <span className="chip">{module.totalLoc.toLocaleString()} LoC</span>
            <span className="chip chip-primary">core</span>
          </div>
          <p className="text-[13.5px] text-muted mt-2 leading-[1.65] font-[350]">
            {module.role}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 text-muted transition-transform duration-220 mt-1.5 ${
            open ? "rotate-180 text-[var(--color-primary)]" : "group-hover:text-[var(--color-fg)]"
          }`}
          strokeWidth={2}
        />
      </button>

      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <Collapsible.Content forceMount asChild>
          <div
            id={`module-panel-${module.id}`}
            role="region"
            style={{
              height,
              overflow: "hidden",
              transition: "height 220ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div ref={contentRef} className="px-5 lg:px-6 pb-6 pt-1 border-t border-[var(--color-border)]">
              {/* Top Files — quick reference */}
              {module.topFiles && module.topFiles.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-subtle uppercase tracking-[0.1em] mb-2.5">
                    <FolderOpen size={13} strokeWidth={2} />
                    <span>关键源码路径</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {module.topFiles.map((filePath) => (
                      <span
                        key={filePath}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-code-bg)] border border-[var(--color-border)] font-mono text-[12px] text-[var(--color-primary)] tracking-tight"
                      >
                        <FileCode size={11} strokeWidth={2} className="text-[var(--color-fg-subtle)] flex-shrink-0" />
                        {filePath}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Files */}
              <div className="mt-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-subtle uppercase tracking-[0.1em] mb-3">
                  <FileCode size={13} strokeWidth={2} />
                  <span>关键源码文件</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {module.keyFiles.map((f) => (
                    <div
                      key={f.path}
                      className="px-3.5 py-2.5 rounded-md bg-[var(--color-code-bg)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-colors"
                    >
                      <div className="font-mono text-[12px] text-[var(--color-primary)] truncate tracking-tight">
                        {f.path}
                      </div>
                      <div className="text-[12px] text-muted mt-1 leading-relaxed">
                        {f.purpose}
                        {f.loc > 0 && (
                          <span className="text-subtle ml-1.5 font-mono tabular-nums">· {f.loc.toLocaleString()}L</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Exports */}
              <div className="mt-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-subtle uppercase tracking-[0.1em] mb-3">
                  <Link2 size={13} strokeWidth={2} />
                  <span>公开导出</span>
                </div>
                <div className="space-y-1.5">
                  {module.keyExports.map((exp) => (
                    <div
                      key={exp.name}
                      className="flex items-start gap-3 px-3.5 py-2.5 rounded-md bg-[var(--color-code-bg)] border border-[var(--color-border)] overflow-hidden"
                    >
                      <span className="chip chip-primary flex-shrink-0 mt-0.5 text-[10.5px] px-1.5 py-0.5">
                        {KIND_LABEL[exp.kind]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[13.5px] text-[var(--color-fg)] tracking-tight">
                          {exp.name}
                        </div>
                        <div className="text-[12.5px] text-muted mt-0.5 leading-relaxed font-[350]">
                          {exp.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Internal Imports */}
              <div className="mt-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-subtle uppercase tracking-[0.1em] mb-3">
                  <BookOpen size={13} strokeWidth={2} />
                  <span>内部依赖模块</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {module.internalImports.map((dep) => {
                    const isCore = [
                      "agent", "mastra", "workflows", "loop", "processors", "llm", "storage", "tools",
                    ].includes(dep);
                    return (
                      <a
                        key={dep}
                        href={`/modules#module-${dep}`}
                        className={`chip ${isCore ? "chip-primary" : ""}`}
                      >
                        {dep}
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Source Notes */}
              {module.sourceNotes && (
                <div className="mt-6 source-note">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)] mb-2">
                    <Sparkles size={12} strokeWidth={2.2} />
                    <span>读源码提示</span>
                  </div>
                  <p className="text-[13px] text-fg/85 leading-[1.7] font-[350]">
                    {module.sourceNotes}
                  </p>
                </div>
              )}

              {/* Sub Structure */}
              {module.subStructure && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-subtle uppercase tracking-[0.1em] mb-3">
                    <GitFork size={13} strokeWidth={2} />
                    <span>模块内部结构</span>
                  </div>
                  <pre className="px-4 py-3.5 rounded-lg bg-[var(--color-code-bg)] border border-[var(--color-border)] font-mono text-[12px] text-[var(--color-fg)] leading-[1.7] overflow-x-auto whitespace-pre">
                    {module.subStructure}
                  </pre>
                </div>
              )}

              {/* Code Snippets */}
              {module.codeSnippets && module.codeSnippets.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-subtle uppercase tracking-[0.1em] mb-3">
                    <Code2 size={13} strokeWidth={2} />
                    <span>关键代码片段</span>
                  </div>
                  <div className="space-y-3">
                    {module.codeSnippets.map((snippet, idx) => (
                      <SnippetPanel key={idx} snippet={snippet} />
                    ))}
                  </div>
                </div>
              )}

              {/* Related Decisions */}
              {module.relatedDecisions && module.relatedDecisions.length > 0 && (
                <div className="mt-5 flex items-center gap-2 flex-wrap text-[12px] pt-4 border-t border-[var(--color-border)]">
                  <span className="text-subtle">关联设计决策:</span>
                  {module.relatedDecisions.map((d) => (
                    <a
                      key={d}
                      href={`/decisions#${d}`}
                      className="text-[var(--color-primary)] hover:text-[var(--color-primary-strong)] transition-colors font-mono text-[11.5px]"
                    >
                      → {d}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
}

function SnippetPanel({ snippet }: { snippet: CoreModule["codeSnippets"] extends (infer T)[] | undefined ? T : never }) {
  const [expanded, setExpanded] = useState(false);
  if (!snippet) return null;

  return (
    <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-surface-hover)] transition-colors"
        aria-expanded={expanded}
      >
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-muted transition-transform duration-200 ${expanded ? "rotate-180 text-[var(--color-primary)]" : ""}`}
          strokeWidth={2}
        />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-[var(--color-fg)] tracking-tight">
            {snippet.title}
          </span>
          <span className="ml-2 text-[11px] font-mono text-subtle">
            {snippet.file}
          </span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[var(--color-border)]">
          <pre className="px-4 py-3.5 bg-[var(--color-code-bg)] overflow-x-auto">
            <code className="font-mono text-[11.5px] leading-[1.65] text-[var(--color-fg)]">
              {snippet.code}
            </code>
          </pre>
          <div className="px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
            <p className="text-[12.5px] text-muted leading-[1.65] font-[350]">
              {snippet.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}