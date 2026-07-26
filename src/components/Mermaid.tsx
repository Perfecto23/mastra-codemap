import { useEffect, useRef, useState } from "react";

interface Props {
  chart: string;
  /**
   * Optional map: node id in mermaid source -> element id to scroll to on click.
   * Node text content (the label inside the node) is matched against keys.
   */
  nodeLinks?: Record<string, string>;
  className?: string;
}

/**
 * Client-side mermaid renderer. Mermaid must be initialized only in the browser
 * and re-run when the chart definition changes.
 */
export default function Mermaid({ chart, nodeLinks, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        darkMode: false,
        toolbar: { show: false },
        themeVariables: {
          background: "#f3f4f6",
          primaryColor: "#eef2ff",
          primaryTextColor: "#111827",
          primaryBorderColor: "#6366f1",
          lineColor: "rgba(99, 102, 241, 0.4)",
          secondaryColor: "#f9fafb",
          tertiaryColor: "#f3f4f6",
          nodeBorder: "#6366f1",
          clusterBkg: "#f9fafb",
          clusterBorder: "rgba(99, 102, 241, 0.25)",
          titleColor: "#111827",
          edgeLabelBackground: "#ffffff",
          actorBkg: "#eef2ff",
          actorBorder: "#6366f1",
          actorTextColor: "#111827",
          actorLineColor: "rgba(99, 102, 241, 0.4)",
          signalColor: "#4b5563",
          signalTextColor: "#111827",
          labelBoxBkgColor: "#ffffff",
          labelBoxBorderColor: "rgba(99, 102, 241, 0.3)",
          labelTextColor: "#111827",
          loopTextColor: "#6366f1",
          noteBkgColor: "#eef2ff",
          noteBorderColor: "#6366f1",
          noteTextColor: "#111827",
          activationBorderColor: "#6366f1",
          activationBkgColor: "rgba(99, 102, 241, 0.1)",
          sequenceNumberColor: "#111827",
          fontFamily:
            '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: "13px",
        },
      });

      if (!ref.current) return;
      try {
        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(id, chart);
        if (cancelled) return;
        ref.current.innerHTML = svg;

        // Attach click handlers: mermaid adds ids to node <g> elements like "flowchart-<id>-<n>".
        // We find nodes by matching the text inside them against nodeLinks keys.
        if (nodeLinks) {
          const svgEl = ref.current.querySelector("svg");
          if (svgEl) {
            const nodes = svgEl.querySelectorAll<SVGGElement>("g.node");
            nodes.forEach((node) => {
              const text = node.textContent?.trim() ?? "";
              // Mermaid labels can contain newlines; match first line (the module id)
              const firstLine = text.split("\n")[0]?.trim();
              // Also try full text (for sequence diagram actors)
              const target =
                nodeLinks[firstLine ?? ""] ?? nodeLinks[text] ?? nodeLinks[text.replace(/\s+/g, " ")];
              if (target) {
                node.style.cursor = "pointer";
                node.addEventListener("click", () => {
                  const el = document.getElementById(target);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    // If target is a collapsible card, dispatch an event to open it
                    el.dispatchEvent(new CustomEvent("mermaid:activate", { bubbles: true }));
                    // Highlight briefly
                    el.classList.add("ring-1", "ring-[var(--color-primary)]");
                    setTimeout(() => {
                      el.classList.remove("ring-1", "ring-[var(--color-primary)]");
                    }, 1500);
                  }
                  // Update URL hash without jumping
                  history.replaceState(null, "", `#${target}`);
                });
              }
            });
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, nodeLinks]);

  if (error) {
    return (
      <div className="p-4 rounded-md border border-red-400/40 bg-red-50 text-sm text-red-700 font-mono whitespace-pre-wrap">
        Mermaid render error: {error}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`mermaid w-full overflow-x-auto py-2 ${className ?? ""}`}
    />
  );
}
