if (typeof MessageChannel === 'undefined') {
  function MessagePort() {
    this.onmessage = null;
    this._target = null;
  }
  MessagePort.prototype.postMessage = function (data) {
    var handler = this._target && this._target.onmessage;
    if (typeof handler === 'function') {
      handler({ data: data });
    }
  };
  function MessageChannelPolyfill() {
    this.port1 = new MessagePort();
    this.port2 = new MessagePort();
    this.port1._target = this.port2;
    this.port2._target = this.port1;
  }
  globalThis.MessageChannel = MessageChannelPolyfill;
}

import { a as createComponent, d as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_B79ahsw9.mjs';
import { $ as $$Layout } from '../chunks/Layout_DDkk2Mp3.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$About = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "About Us | FreeCipies", "description": "Learn about FreeCipies - your destination for delicious, easy-to-follow recipes from around the world.", "data-astro-cid-kh7btl4r": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="about-page" data-astro-cid-kh7btl4r> <!-- Hero Section --> <section class="hero" data-astro-cid-kh7btl4r> <div class="hero-content" data-astro-cid-kh7btl4r> <h1 data-astro-cid-kh7btl4r>About <span class="highlight" data-astro-cid-kh7btl4r>FreeCipies</span></h1> <p class="tagline" data-astro-cid-kh7btl4r>Where passion meets flavor</p> </div> </section> <!-- Mission Section --> <section class="mission" data-astro-cid-kh7btl4r> <div class="container" data-astro-cid-kh7btl4r> <div class="mission-content" data-astro-cid-kh7btl4r> <div class="mission-icon" data-astro-cid-kh7btl4r>🍳</div> <h2 data-astro-cid-kh7btl4r>Our Mission</h2> <p data-astro-cid-kh7btl4r>
At FreeCipies, we believe that great food should be
						accessible to everyone. Our mission is to inspire home
						cooks around the world with delicious, easy-to-follow
						recipes that bring joy to the kitchen and smiles to the
						table.
</p> </div> </div> </section> <!-- Story Section --> <section class="story" data-astro-cid-kh7btl4r> <div class="container" data-astro-cid-kh7btl4r> <div class="story-grid" data-astro-cid-kh7btl4r> <div class="story-image" data-astro-cid-kh7btl4r> <div class="image-placeholder" data-astro-cid-kh7btl4r> <span data-astro-cid-kh7btl4r>🥘</span> </div> </div> <div class="story-text" data-astro-cid-kh7btl4r> <h2 data-astro-cid-kh7btl4r>Our Story</h2> <p data-astro-cid-kh7btl4r>
FreeCipies started with a simple idea: sharing the
							recipes we love with the world. What began as a
							small collection of family favorites has grown into
							a vibrant community of food lovers.
</p> <p data-astro-cid-kh7btl4r>
Every recipe on our site is carefully tested and
							crafted to ensure success in your kitchen. From
							quick weeknight dinners to impressive weekend
							feasts, we've got you covered.
</p> <p data-astro-cid-kh7btl4r>
We're passionate about celebrating diverse cuisines,
							supporting local ingredients, and making cooking an
							enjoyable experience for everyone—whether you're a
							beginner or a seasoned chef.
</p> </div> </div> </div> </section> <!-- Values Section --> <section class="values" data-astro-cid-kh7btl4r> <div class="container" data-astro-cid-kh7btl4r> <h2 data-astro-cid-kh7btl4r>What We Stand For</h2> <div class="values-grid" data-astro-cid-kh7btl4r> <div class="value-card" data-astro-cid-kh7btl4r> <div class="value-icon" data-astro-cid-kh7btl4r>✨</div> <h3 data-astro-cid-kh7btl4r>Quality</h3> <p data-astro-cid-kh7btl4r>
Every recipe is tested multiple times to ensure
							perfect results every time.
</p> </div> <div class="value-card" data-astro-cid-kh7btl4r> <div class="value-icon" data-astro-cid-kh7btl4r>🌍</div> <h3 data-astro-cid-kh7btl4r>Diversity</h3> <p data-astro-cid-kh7btl4r>
We celebrate cuisines from around the world,
							bringing global flavors to your kitchen.
</p> </div> <div class="value-card" data-astro-cid-kh7btl4r> <div class="value-icon" data-astro-cid-kh7btl4r>💚</div> <h3 data-astro-cid-kh7btl4r>Sustainability</h3> <p data-astro-cid-kh7btl4r>
We promote seasonal ingredients and sustainable
							cooking practices.
</p> </div> <div class="value-card" data-astro-cid-kh7btl4r> <div class="value-icon" data-astro-cid-kh7btl4r>👨‍👩‍👧‍👦</div> <h3 data-astro-cid-kh7btl4r>Community</h3> <p data-astro-cid-kh7btl4r>
We're building a community where food lovers can
							share, learn, and grow together.
</p> </div> </div> </div> </section> <!-- Stats Section --> <section class="stats" data-astro-cid-kh7btl4r> <div class="container" data-astro-cid-kh7btl4r> <div class="stats-grid" data-astro-cid-kh7btl4r> <div class="stat-item" data-astro-cid-kh7btl4r> <span class="stat-number" data-astro-cid-kh7btl4r>1000+</span> <span class="stat-label" data-astro-cid-kh7btl4r>Recipes</span> </div> <div class="stat-item" data-astro-cid-kh7btl4r> <span class="stat-number" data-astro-cid-kh7btl4r>50K+</span> <span class="stat-label" data-astro-cid-kh7btl4r>Happy Cooks</span> </div> <div class="stat-item" data-astro-cid-kh7btl4r> <span class="stat-number" data-astro-cid-kh7btl4r>25+</span> <span class="stat-label" data-astro-cid-kh7btl4r>Cuisines</span> </div> <div class="stat-item" data-astro-cid-kh7btl4r> <span class="stat-number" data-astro-cid-kh7btl4r>100%</span> <span class="stat-label" data-astro-cid-kh7btl4r>Free Forever</span> </div> </div> </div> </section> <!-- CTA Section --> <section class="cta" data-astro-cid-kh7btl4r> <div class="container" data-astro-cid-kh7btl4r> <h2 data-astro-cid-kh7btl4r>Ready to Start Cooking?</h2> <p data-astro-cid-kh7btl4r>
Explore our collection of delicious recipes and find your
					next favorite dish.
</p> <a href="/recipes" class="cta-button" data-astro-cid-kh7btl4r>Browse Recipes</a> </div> </section> </main> ` })} `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/about.astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/about.astro";
const $$url = "/about";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$About,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
