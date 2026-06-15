// src/site/scripts/stories-player.ts
//
// Opens the on-site stories bar through amp-story-player's lightbox, following
// the official entry-point pattern:
// https://web-player-cards-carousel.web.app/examples/amp-story/player-entry-point-cards.html
// Key requirements that this mirrors:
//  - wait for the player's "ready" event (or isReady) before calling its API,
//  - read the canonical story list via getStories() and open with
//    player.show(stories[idx].href) — the player's own resolved URL,
//  - reveal a hidden backdrop on open and hide it on amp-story-player-close.
// Without JS (or before the player is ready) the rings stay plain links that
// navigate to the standalone AMP page (progressive enhancement).

interface AmpStoryPlayerStory {
  href: string;
}

interface AmpStoryPlayerEl extends HTMLElement {
  isReady?: boolean;
  getStories(): AmpStoryPlayerStory[];
  show(storyUrl: string | null, pageId?: string | null): void;
}

export class StoriesBarController {
  private player: AmpStoryPlayerEl | null;
  private lightbox: HTMLElement | null;
  private rings: HTMLAnchorElement[];
  private bound = false;

  constructor(private root: HTMLElement) {
    this.player = root.querySelector<AmpStoryPlayerEl>("amp-story-player");
    this.lightbox = root.querySelector<HTMLElement>("[data-stories-lightbox]");
    this.rings = Array.from(root.querySelectorAll<HTMLAnchorElement>("[data-story-href]"));

    // No player element (e.g. the amp-story-player script never loaded) → leave
    // the rings as ordinary links to the AMP pages.
    if (!this.player) return;

    // Mount the lightbox at <body> level so its fixed overlay is in the root
    // stacking context, above the sticky header — matching the official
    // entry-point example. Nested in the stories <section> it could be trapped
    // below higher-painted siblings.
    if (this.lightbox && this.lightbox.parentElement !== document.body) {
      document.body.appendChild(this.lightbox);
    }

    const player = this.player;
    if (player.isReady) {
      this.bind();
    } else {
      player.addEventListener("ready", () => this.bind(), { once: true });
    }
  }

  private bind() {
    if (this.bound || !this.player) return;
    this.bound = true;

    const stories = this.player.getStories();

    this.rings.forEach((ring, idx) => {
      ring.addEventListener("click", (event) => {
        const story = stories[idx];
        // Unknown story → let the link navigate instead of trapping the click.
        if (!story) return;
        event.preventDefault();
        this.open(story.href);
      });
    });

    this.player.addEventListener("amp-story-player-close", () => this.close());
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
