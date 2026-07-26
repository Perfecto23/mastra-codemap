import { useEffect } from "react";

/**
 * Highlights the single step card closest to the viewport center.
 * Only one card is highlighted at a time.
 */
export default function StepHighlight() {
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>("[data-step-card]");
    if (cards.length === 0) return;

    let current: HTMLElement | null = null;

    const update = () => {
      const viewportCenter = window.innerHeight / 2;
      let closest: HTMLElement | null = null;
      let closestDist = Infinity;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const dist = Math.abs(cardCenter - viewportCenter);
        if (dist < closestDist && rect.top < window.innerHeight && rect.bottom > 0) {
          closestDist = dist;
          closest = card;
        }
      });

      if (closest !== current) {
        if (current) current.removeAttribute("data-visible");
        if (closest) closest.setAttribute("data-visible", "true");
        current = closest;
      }
    };

    window.addEventListener("scroll", update, { passive: true });
    update();

    return () => window.removeEventListener("scroll", update);
  }, []);

  return null;
}
