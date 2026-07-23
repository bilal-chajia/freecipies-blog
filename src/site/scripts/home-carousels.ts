import EmblaCarousel, { type EmblaCarouselType } from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';

const CAROUSEL_SELECTOR = '[data-home-carousel]';
const SELECTED_CLASS = 'is-selected';
const ENHANCED_CLASS = 'is-carousel-enhanced';

type HomeCarouselNode = HTMLElement & {
  dataset: DOMStringMap & {
    homeCarousel?: string;
    autoplay?: string;
  };
};

interface CarouselInstance {
  embla: EmblaCarouselType;
  destroy: () => void;
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const getViewport = (root: HTMLElement) =>
  root.querySelector<HTMLElement>('[data-home-carousel-viewport]');

const getPrevButton = (root: HTMLElement) =>
  root.querySelector<HTMLButtonElement>('[data-home-carousel-prev]');

const getNextButton = (root: HTMLElement) =>
  root.querySelector<HTMLButtonElement>('[data-home-carousel-next]');

const getDots = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('[data-home-carousel-dot]'));

const setButtonState = (button: HTMLButtonElement | null, disabled: boolean) => {
  if (!button) return;
  button.disabled = disabled;
  button.setAttribute('aria-disabled', String(disabled));
};

const initCarousel = (root: HomeCarouselNode): CarouselInstance | null => {
  const viewport = getViewport(root);
  if (!viewport) return null;

  const shouldLoop = root.dataset.homeCarousel === 'loop';
  const shouldAutoplay = root.dataset.autoplay === 'true' && !prefersReducedMotion();
  const plugins = shouldAutoplay
    ? [
        Autoplay({
          delay: 5500,
          stopOnInteraction: true,
          stopOnMouseEnter: true,
        }),
      ]
    : [];

  root.classList.add(ENHANCED_CLASS);

  let embla: EmblaCarouselType;
  try {
    embla = EmblaCarousel(
      viewport,
      {
        align: 'start',
        containScroll: 'trimSnaps',
        dragFree: false,
        loop: shouldLoop,
        slidesToScroll: 1,
      },
      plugins,
    );
  } catch (error) {
    root.classList.remove(ENHANCED_CLASS);
    throw error;
  }

  const prevButton = getPrevButton(root);
  const nextButton = getNextButton(root);
  const dots = getDots(root);

  const selectPrev = () => embla.scrollPrev();
  const selectNext = () => embla.scrollNext();
  const selectDot = (index: number) => embla.scrollTo(index);

  const updateControls = () => {
    const selectedIndex = embla.selectedScrollSnap();

    setButtonState(prevButton, !embla.canScrollPrev());
    setButtonState(nextButton, !embla.canScrollNext());

    dots.forEach((dot, index) => {
      const isSelected = index === selectedIndex;
      dot.classList.toggle(SELECTED_CLASS, isSelected);
      dot.setAttribute('aria-selected', String(isSelected));
      dot.setAttribute('tabindex', isSelected ? '0' : '-1');
    });
  };

  prevButton?.addEventListener('click', selectPrev);
  nextButton?.addEventListener('click', selectNext);
  const dotClickHandlers = dots.map((dot, index) => {
    const handler = () => selectDot(index);
    dot.addEventListener('click', handler);
    return { dot, handler };
  });

  embla.on('init', updateControls);
  embla.on('select', updateControls);
  embla.on('reInit', updateControls);
  updateControls();

  return {
    embla,
    destroy: () => {
      prevButton?.removeEventListener('click', selectPrev);
      nextButton?.removeEventListener('click', selectNext);
      dotClickHandlers.forEach(({ dot, handler }) => {
        dot.removeEventListener('click', handler);
      });
      root.classList.remove(ENHANCED_CLASS);
      embla.destroy();
    },
  };
};

const initHomeCarousels = () => {
  const carousels = Array.from(document.querySelectorAll<HomeCarouselNode>(CAROUSEL_SELECTOR))
    .map(initCarousel)
    .filter((instance): instance is CarouselInstance => instance !== null);

  window.addEventListener(
    'pagehide',
    () => {
      carousels.forEach((instance) => instance.destroy());
    },
    { once: true },
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomeCarousels, { once: true });
} else {
  initHomeCarousels();
}
