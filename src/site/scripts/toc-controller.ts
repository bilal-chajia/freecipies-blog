/**
 * TocController - Manages the interactive behavior of the Table of Contents.
 */
export class TocController {
    private toc: HTMLElement;
    private body: HTMLElement;
    private nav: HTMLElement;
    private toggleBtn: HTMLElement | null;
    private showMoreLabel: HTMLElement | null;
    private links: NodeListOf<HTMLAnchorElement>;
    private headings: HTMLElement[] = [];
    private observer: IntersectionObserver | null = null;
    
    private fullHeight: number = 0;
    private truncHeight: number = 0;
    private threshold: number = 280;
    private targetTruncHeight: number = 160;

    constructor(toc: HTMLElement) {
        this.toc = toc;
        this.body = toc.querySelector<HTMLElement>(".toc-body")!;
        this.nav = toc.querySelector<HTMLElement>(".toc-nav")!;
        this.toggleBtn = toc.querySelector<HTMLElement>(".toc-toggle-btn");
        this.showMoreLabel = toc.querySelector<HTMLElement>(".toc-show-more-label");
        this.links = toc.querySelectorAll<HTMLAnchorElement>(".toc-link");

        if (!this.body || !this.nav) return;

        this.init();
        this.setupObservers();
        this.setupEventListeners();
    }

    private init() {
        const defaultOpen = this.toc.dataset.defaultOpen !== "false";
        this.fullHeight = this.nav.scrollHeight;
        this.truncHeight = this.calculateTruncHeight();

        if (this.fullHeight > this.threshold) {
            this.toc.classList.add("can-truncate");
            if (defaultOpen) {
                this.expand(false);
            } else {
                this.collapse(false);
            }
        } else {
            this.body.style.maxHeight = "none";
            this.toc.classList.add("is-expanded");
            this.toggleBtn?.setAttribute("hidden", "");
        }

        // Enable smooth transitions after layout settles
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.toc.classList.add("toc-ready");
            });
        });

        this.syncUI();
    }

    private calculateTruncHeight(): number {
        const rows = Array.from(this.nav.querySelectorAll<HTMLElement>(".toc-group, .toc-item"));
        const navTop = this.nav.getBoundingClientRect().top;
        let height = 0;

        for (const row of rows) {
            const rowBottom = row.getBoundingClientRect().bottom - navTop;
            if (rowBottom <= this.targetTruncHeight) {
                height = Math.max(height, Math.ceil(rowBottom));
            }
        }

        return height > 0 ? height : this.targetTruncHeight;
    }

    private setupObservers() {
        // Active heading tracking
        const ids = Array.from(this.links)
            .map((a) => a.dataset.tocTarget)
            .filter((id): id is string => Boolean(id));
            
        this.headings = ids
            .map((id) => document.getElementById(id))
            .filter((h): h is HTMLElement => h !== null);

        if (this.headings.length > 0) {
            this.observer = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            this.setActiveLink(entry.target.id);
                        }
                    }
                },
                { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
            );
            this.headings.forEach((h) => this.observer?.observe(h));
            this.setActiveLink(this.headings[0].id);
        }
    }

    private setupEventListeners() {
        // Smooth scroll
        this.links.forEach((link) => {
            link.addEventListener("click", (e) => {
                const href = link.getAttribute("href");
                if (!href) return;
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                    history.pushState(null, "", href);
                }
            });
        });

        // Toggle button
        this.toggleBtn?.addEventListener("click", () => this.toggle());

        // Resize handling
        window.addEventListener("resize", () => this.handleResize());
    }

    private handleResize() {
        this.fullHeight = this.nav.scrollHeight;
        this.truncHeight = this.calculateTruncHeight();
        
        if (this.toc.classList.contains("is-expanded")) {
            this.body.style.maxHeight = this.fullHeight + "px";
        } else {
            this.body.style.maxHeight = this.truncHeight + "px";
        }
    }

    private setActiveLink(id: string) {
        this.links.forEach((link) => {
            const isActive = link.dataset.tocTarget === id;
            link.classList.toggle("toc-active", isActive);
            link.setAttribute("aria-current", isActive ? "true" : "false");
        });
    }

    private toggle() {
        this.toc.classList.contains("is-expanded") ? this.collapse() : this.expand();
    }

    private expand(animate = true) {
        this.toc.classList.add("is-expanded");
        this.body.style.maxHeight = this.fullHeight + "px";
        this.syncUI();
    }

    private collapse(animate = true) {
        this.toc.classList.remove("is-expanded");
        this.body.style.maxHeight = this.truncHeight + "px";
        this.syncUI();
    }

    private syncUI() {
        const expanded = this.toc.classList.contains("is-expanded");
        this.toggleBtn?.setAttribute("aria-expanded", String(expanded));
        if (this.showMoreLabel) {
            this.showMoreLabel.textContent = expanded ? "Show less" : "Show all";
        }
    }
}

// Auto-initialize
export function initToc() {
    document.querySelectorAll<HTMLElement>(".blog-toc").forEach((toc) => {
        new TocController(toc);
    });
}
