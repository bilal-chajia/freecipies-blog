// src/site/scripts/stories-player.ts
//
// Opens the on-site stories bar through amp-story-player's lightbox, following
// the official entry-point pattern:
// https://web-player-cards-carousel.web.app/examples/amp-story/player-entry-point-cards.html
// Key requirements that this mirrors:
//  - wait for the player's "ready" event (or isReady) before calling its API,
//  - reveal a hidden backdrop on open and hide it on amp-story-player-close.
//
// Performance: the amp-story-player runtime (~96 KiB JS) and the slide
// prerender (which eagerly fetches full-size cover images, ~830 KiB on the
// homepage) are NOT loaded at page load. The player's CSS+JS are injected
// lazily on first user intent (pointer/focus/touch) over the bar, or on click.
// Until then the rings stay plain links that navigate to the standalone AMP
// page (progressive enhancement).

const AMP_PLAYER_JS = "https://cdn.ampproject.org/amp-story-player-v0.js";
const AMP_PLAYER_CSS = "https://cdn.ampproject.org/amp-story-player-v0.css";

let assetsPromise: Promise<void> | null = null;

/** Inject the amp-story-player CSS + JS exactly once, shared across all bars. */
function loadPlayerAssets(): Promise<void> {
  if (assetsPromise) return assetsPromise;

  assetsPromise = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${AMP_PLAYER_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = AMP_PLAYER_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${AMP_PLAYER_JS}"]`,
    );
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = AMP_PLAYER_JS;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("amp-story-player failed to load")), {
      once: true,
    });
    document.head.appendChild(script);
  });

  return assetsPromise;
}

interface AmpStoryPlayerEl extends HTMLElement {
  isReady?: boolean;
  show(storyUrl: string | null, pageId?: string | null): void;
}

export class StoriesBarController {
  private player: AmpStoryPlayerEl | null;
  private lightbox: HTMLElement | null;
  private rings: HTMLAnchorElement[];
  private readyPromise: Promise<void> | null = null;
  private closeBound = false;

  constructor(private root: HTMLElement) {
    this.player = root.querySelector<AmpStoryPlayerEl>("amp-story-player");
    this.lightbox = root.querySelector<HTMLElement>("[data-stories-lightbox]");
    this.rings = Array.from(root.querySelectorAll<HTMLAnchorElement>("[data-story-href]"));

    // No player element → leave the rings as ordinary links to the AMP pages.
    if (!this.player) return;

    // Mount the lightbox at <body> level so its fixed overlay is in the root
    // stacking context, above the sticky header.
    if (this.lightbox && this.lightbox.parentElement !== document.body) {
      document.body.appendChild(this.lightbox);
    }

    // Preload the player assets the moment the user shows intent to interact,
    // so the lightbox is ready (or nearly so) by the time they click.
    const preload = () => void this.ensureReady();
    ["pointerenter", "focusin", "touchstart"].forEach((evt) =>
      this.root.addEventListener(evt, preload, { once: true, passive: true }),
    );

    this.rings.forEach((ring) => {
      ring.addEventListener("click", (event) => this.onRingClick(event, ring));
    });
  }

  /** Lazy-load the runtime and resolve once the player reports ready. */
  private ensureReady(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = loadPlayerAssets().then(
      () =>
        new Promise<void>((resolve) => {
          const player = this.player;
          if (!player) {
            resolve();
            return;
          }
          if (!this.closeBound) {
            player.addEventListener("amp-story-player-close", () => this.close());
            this.closeBound = true;
          }
          if (player.isReady) {
            resolve();
          } else {
            player.addEventListener("ready", () => resolve(), { once: true });
          }
        }),
    );

    return this.readyPromise;
  }

  private async onRingClick(event: MouseEvent, ring: HTMLAnchorElement) {
    const href = ring.dataset.storyHref;
    // Let modified clicks (new tab) and unknown hrefs fall through to the link.
    if (!href || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

    event.preventDefault();
    try {
      await this.ensureReady();
      this.open(href);
    } catch {
      // Runtime failed to load → fall back to the standalone AMP page.
      window.location.href = href;
    }
  }

  private open(href: string) {
    this.lightbox?.classList.add("is-open");
    document.body.style.overflow = "hidden";
    this.player?.show(href);
  }

  private close() {
    this.lightbox?.classList.remove("is-open");
    document.body.style.overflow = "";
  }
}

export function initStoriesBar() {
  document.querySelectorAll<HTMLElement>("[data-stories-bar]").forEach((bar) => {
    new StoriesBarController(bar);
  });
}
