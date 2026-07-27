import { useEffect } from "react";

/**
 * Ties two things together as the user scrolls the dataflow page:
 *  1. The step CARD closest to viewport center gets `data-visible="true"`
 *     (already styled in the page CSS as a left accent bar).
 *  2. The corresponding mermaid sequence diagram — actors + the active
 *     message segment — receive `data-active="true"`, while the rest of the
 *     diagram dims slightly. The diagram sits above the timeline, so the
 *     reader can look at it and instantly see which step the page is on.
 *
 * Mapping is by step order: step[i] corresponds to the ith <g class="message...">
 * in the rendered mermaid SVG. Steps inside the loop block map to the messages
 * between the `loop` rectangle and its closing.
 */
export default function StepHighlight() {
  useEffect(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-step-card]")
    );
    if (cards.length === 0) return;

    let current: HTMLElement | null = null;
    let currentIndex = -1;

    // Cache mermaid elements once they exist (rendered async by Mermaid.tsx)
    let messageEls: SVGElement[] = [];
    let actorEls: SVGElement[] = [];
    let noteEls: SVGElement[] = [];
    let loopBox: SVGGElement | null = null;
    let altBoxes: SVGGElement[] = [];
    let svg: SVGSVGElement | null = null;

    const cacheMermaid = () => {
      svg = document.querySelector(".mermaid svg");
      if (!svg) return false;
      // mermaid renders messages in order; selectors differ slightly across versions
      messageEls = Array.from(
        svg.querySelectorAll<SVGElement>(
          ".messageLine0, .messageLine1, .loopLine, .messageText"
        )
      );
      actorEls = Array.from(svg.querySelectorAll<SVGElement>("g.actor"));
      noteEls = Array.from(svg.querySelectorAll<SVGElement>("g.note"));
      loopBox = svg.querySelector<SVGGElement>("g.loopText, g.loopLine");
      altBoxes = Array.from(svg.querySelectorAll<SVGGElement>("g.alt"));
      svg.setAttribute("data-highlight-ready", "true");
      return true;
    };

    // Try a few times as the mermaid client component hydrates
    let tries = 0;
    const interval = setInterval(() => {
      if (cacheMermaid() || ++tries > 20) clearInterval(interval);
    }, 200);

    const clear = () => {
      if (svg) svg.removeAttribute("data-active-step");
      messageEls.forEach((el) => el.removeAttribute("data-active"));
      actorEls.forEach((el) => el.removeAttribute("data-active"));
      noteEls.forEach((el) => el.removeAttribute("data-active"));
    };

    const apply = (idx: number) => {
      if (!svg) return;
      svg.setAttribute("data-active-step", String(idx));
      // Highlight all message segments that belong to this step.
      // We approximate: step N → message groups [N*4 .. N*4+3] (a typical step
      // in our diagram has 2 lines + text + actor tick). Fallback to a single
      // message when the count doesn't match.
      const perStep = Math.max(2, Math.floor(messageEls.length / cards.length));
      messageEls.forEach((el, i) => {
        const belong =
          i >= idx * perStep && i < (idx + 1) * perStep;
        if (belong) el.setAttribute("data-active", "true");
        else el.removeAttribute("data-active");
      });
      // Highlight actors involved: any actor mentioned in the active card label/actor text
      const activeCard = cards[idx];
      if (activeCard) {
        const cardText = activeCard.textContent || "";
        actorEls.forEach((el) => {
          const name = (el.textContent || "").split(/\s+/)[0] || "";
          // Match by first token (e.g. "PrepareStream" vs card's "PrepareStream Workflow")
          const involved =
            name &&
            cardText
              .replace(/\s+/g, "")
              .toLowerCase()
              .includes(name.replace(/\W/g, "").toLowerCase());
          if (involved) el.setAttribute("data-active", "true");
          else el.removeAttribute("data-active");
        });
      }
    };

    const update = () => {
      const viewportCenter = window.innerHeight / 2;
      let closest: HTMLElement | null = null;
      let closestIdx = -1;
      let closestDist = Infinity;

      cards.forEach((card, i) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const dist = Math.abs(cardCenter - viewportCenter);
        if (dist < closestDist && rect.top < window.innerHeight && rect.bottom > 0) {
          closestDist = dist;
          closest = card;
          closestIdx = i;
        }
      });

      if (closest !== current) {
        if (current) current.removeAttribute("data-visible");
        if (closest) closest.setAttribute("data-visible", "true");
        current = closest;
      }
      if (closestIdx !== currentIndex) {
        if (closestIdx === -1) clear();
        else apply(closestIdx);
        currentIndex = closestIdx;
      }
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      clear();
    };
  }, []);

  return null;
}
