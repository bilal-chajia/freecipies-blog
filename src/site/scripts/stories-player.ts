// src/site/scripts/stories-player.ts

/** Minimal typing for the parts of the amp-story-player API we use. */
interface AmpStoryPlayerEl extends HTMLElement {
  show(storyUrl: string | null, pageId?: string | null): void;
}

export class StoriesBarController {
  private player: AmpStoryPlayerEl | null;
  private lightbox: HTMLElement | null;
  private rings: NodeListOf<HTMLAnchorElement>;

  constructor(private root: HTMLElement) {
    this.player = root.querySelector<AmpStoryPlayerEl>("amp-story-player");
    this.lightbox = root.querySelector<HTMLElement>("[data-stories-lightbox]");
    this.rings = root.querySelectorAll<HTMLAnchorElement>("[data-story-href]");
    this.bind();
  }

  private open(href: string) {
    this.lightbox?.classList.add("is-open");
    document.body.style.overflow = "hidden";
    // amp-story-player resolves its entry <a href> list to ABSOLUTE URLs,
    // so show() must be given the absolute URL — passing the root-relative
    // attribute throws "Story URL not found in the player".
    this.player?.show(new URL(href, window.location.origin).href);
  }

  private close() {
    this.lightbox?.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  private bind() {
    this.rings.forEach((ring) => {
      ring.addEventListener("click", (event) => {
        // No player available (no JS / not yet loaded) → let the link navigate
        // to the standalone AMP page (progressive enhancement).
        if (!this.player || typeof this.player.show !== "function") return;
        const href = ring.getAttribute("data-story-href");
        if (!href) return;
        event.preventDefault();
        this.open(href);
      });
    });

    // The player's "close" control dispatches this when the lightbox is dismissed.
    this.player?.addEventListener("amp-story-player-close", () => this.close());
  }
}

export function initStoriesBar() {
  document.querySelectorAll<HTMLElement>("[data-stories-bar]").forEach((bar) => {
    new StoriesBarController(bar);
  });
}
