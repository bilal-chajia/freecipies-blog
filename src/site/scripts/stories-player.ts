// src/site/scripts/stories-player.ts

/** Minimal typing for the parts of the amp-story-player API we use. */
interface AmpStoryPlayerEl extends HTMLElement {
  show(storyUrl: string | null, pageId?: string | null): void;
}

export class StoriesBarController {
  private player: AmpStoryPlayerEl | null;
  private rings: NodeListOf<HTMLAnchorElement>;

  constructor(private root: HTMLElement) {
    this.player = root.querySelector<AmpStoryPlayerEl>("amp-story-player");
    this.rings = root.querySelectorAll<HTMLAnchorElement>("[data-story-href]");
    this.bind();
  }

  private bind() {
    this.rings.forEach((ring) => {
      ring.addEventListener("click", (event) => {
        // No player available → let the link navigate to the AMP page.
        if (!this.player || typeof this.player.show !== "function") return;
        event.preventDefault();
        const href = ring.getAttribute("data-story-href");
        if (href) this.player.show(href);
      });
    });

    // Restore scroll when the player lightbox closes.
    this.player?.addEventListener("amp-story-player-close", () => {
      document.body.style.overflow = "";
    });
  }
}

export function initStoriesBar() {
  document.querySelectorAll<HTMLElement>("[data-stories-bar]").forEach((bar) => {
    new StoriesBarController(bar);
  });
}
