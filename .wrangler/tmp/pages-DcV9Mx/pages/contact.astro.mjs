globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, r as renderComponent, am as renderScript, a as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_Bsmdvglz.mjs';
import { $ as $$Layout } from '../chunks/Layout_Cyf8gyLe.mjs';
/* empty css                                   */
export { renderers } from '../renderers.mjs';

const $$Contact = createComponent(async ($$result, $$props, $$slots) => {
  const siteTitle = "Contact Us - Freecipies";
  const siteDescription = "Get in touch with the Freecipies team. We'd love to hear from you!";
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": siteTitle, "description": siteDescription, "data-astro-cid-uw5kdbxl": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="contact-page" data-astro-cid-uw5kdbxl> <!-- Hero Section --> <section class="contact-hero" data-astro-cid-uw5kdbxl> <div class="container" data-astro-cid-uw5kdbxl> <h1 class="page-title" data-astro-cid-uw5kdbxl> <span class="title-dot" data-astro-cid-uw5kdbxl></span>
Get In Touch
</h1> <p class="page-subtitle" data-astro-cid-uw5kdbxl>
Have a question, suggestion, or just want to say hello? We'd
                    love to hear from you!
</p> </div> </section> <!-- Contact Content --> <section class="contact-content" data-astro-cid-uw5kdbxl> <div class="container" data-astro-cid-uw5kdbxl> <div class="contact-grid" data-astro-cid-uw5kdbxl> <!-- Contact Form --> <div class="contact-form-wrapper" data-astro-cid-uw5kdbxl> <h2 data-astro-cid-uw5kdbxl>Send Us a Message</h2> <form id="contactForm" class="contact-form" data-astro-cid-uw5kdbxl> <div class="form-group" data-astro-cid-uw5kdbxl> <label for="name" data-astro-cid-uw5kdbxl>Your Name</label> <input type="text" id="name" name="name" placeholder="John Doe" required data-astro-cid-uw5kdbxl> </div> <div class="form-group" data-astro-cid-uw5kdbxl> <label for="email" data-astro-cid-uw5kdbxl>Email Address</label> <input type="email" id="email" name="email" placeholder="john@example.com" required data-astro-cid-uw5kdbxl> </div> <div class="form-group" data-astro-cid-uw5kdbxl> <label for="subject" data-astro-cid-uw5kdbxl>Subject</label> <select id="subject" name="subject" required data-astro-cid-uw5kdbxl> <option value="" data-astro-cid-uw5kdbxl>Select a topic...</option> <option value="general" data-astro-cid-uw5kdbxl>General Inquiry</option> <option value="recipe" data-astro-cid-uw5kdbxl>Recipe Question</option> <option value="collaboration" data-astro-cid-uw5kdbxl>Collaboration / Partnership</option> <option value="feedback" data-astro-cid-uw5kdbxl>Feedback / Suggestions</option> <option value="bug" data-astro-cid-uw5kdbxl>Report an Issue</option> </select> </div> <div class="form-group" data-astro-cid-uw5kdbxl> <label for="message" data-astro-cid-uw5kdbxl>Your Message</label> <textarea id="message" name="message" rows="6" placeholder="Tell us what's on your mind..." required data-astro-cid-uw5kdbxl></textarea> </div> <button type="submit" class="submit-btn" data-astro-cid-uw5kdbxl> <span class="btn-text" data-astro-cid-uw5kdbxl>Send Message</span> <span class="btn-icon" data-astro-cid-uw5kdbxl>→</span> </button> </form> <div id="formStatus" class="form-status" data-astro-cid-uw5kdbxl></div> </div> <!-- Contact Info --> <div class="contact-info" data-astro-cid-uw5kdbxl> <div class="info-card" data-astro-cid-uw5kdbxl> <div class="info-icon" data-astro-cid-uw5kdbxl> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-uw5kdbxl> <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" data-astro-cid-uw5kdbxl></path> <polyline points="22,6 12,13 2,6" data-astro-cid-uw5kdbxl></polyline> </svg> </div> <h3 data-astro-cid-uw5kdbxl>Email Us</h3> <p data-astro-cid-uw5kdbxl>For general inquiries and support</p> <a href="mailto:hello@recipes-saas.com" data-astro-cid-uw5kdbxl>hello@recipes-saas.com</a> </div> <div class="info-card" data-astro-cid-uw5kdbxl> <div class="info-icon" data-astro-cid-uw5kdbxl> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-uw5kdbxl> <circle cx="12" cy="12" r="10" data-astro-cid-uw5kdbxl></circle> <polyline points="12,6 12,12 16,14" data-astro-cid-uw5kdbxl></polyline> </svg> </div> <h3 data-astro-cid-uw5kdbxl>Response Time</h3> <p data-astro-cid-uw5kdbxl>We typically respond within</p> <span class="highlight" data-astro-cid-uw5kdbxl>24-48 hours</span> </div> <div class="info-card" data-astro-cid-uw5kdbxl> <div class="info-icon" data-astro-cid-uw5kdbxl> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-uw5kdbxl> <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" data-astro-cid-uw5kdbxl></path> </svg> </div> <h3 data-astro-cid-uw5kdbxl>Follow Us</h3> <p data-astro-cid-uw5kdbxl>Stay connected on social media</p> <div class="social-links" data-astro-cid-uw5kdbxl> <a href="#" aria-label="Pinterest" data-astro-cid-uw5kdbxl> <svg viewBox="0 0 24 24" fill="currentColor" data-astro-cid-uw5kdbxl> <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.44l1.4-5.96s-.35-.71-.35-1.76c0-1.64.95-2.87 2.14-2.87 1 0 1.49.76 1.49 1.67 0 1.02-.65 2.54-.99 3.95-.28 1.18.59 2.15 1.76 2.15 2.11 0 3.74-2.23 3.74-5.44 0-2.85-2.05-4.84-4.97-4.84-3.39 0-5.38 2.54-5.38 5.17 0 1.02.39 2.12.88 2.72a.35.35 0 0 1 .08.34l-.33 1.34c-.05.22-.17.27-.4.16-1.49-.69-2.42-2.87-2.42-4.62 0-3.76 2.73-7.21 7.88-7.21 4.14 0 7.35 2.95 7.35 6.88 0 4.11-2.59 7.42-6.19 7.42-1.21 0-2.35-.63-2.74-1.37l-.74 2.83c-.27 1.04-1 2.35-1.49 3.14A12 12 0 1 0 12 0z" data-astro-cid-uw5kdbxl></path> </svg> </a> <a href="#" aria-label="Instagram" data-astro-cid-uw5kdbxl> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-uw5kdbxl> <rect x="2" y="2" width="20" height="20" rx="5" ry="5" data-astro-cid-uw5kdbxl></rect> <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" data-astro-cid-uw5kdbxl></path> <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" data-astro-cid-uw5kdbxl></line> </svg> </a> <a href="#" aria-label="Facebook" data-astro-cid-uw5kdbxl> <svg viewBox="0 0 24 24" fill="currentColor" data-astro-cid-uw5kdbxl> <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" data-astro-cid-uw5kdbxl></path> </svg> </a> </div> </div> <div class="info-card highlight-card" data-astro-cid-uw5kdbxl> <h3 data-astro-cid-uw5kdbxl>🍳 Recipe Submissions</h3> <p data-astro-cid-uw5kdbxl>
Want to share your recipe with our community?
                                We're always looking for talented home cooks!
</p> <a href="mailto:recipes@recipes-saas.com" class="link-btn" data-astro-cid-uw5kdbxl>Submit a Recipe</a> </div> </div> </div> </div> </section> <!-- FAQ Section --> <section class="faq-section" data-astro-cid-uw5kdbxl> <div class="container" data-astro-cid-uw5kdbxl> <h2 data-astro-cid-uw5kdbxl>Frequently Asked Questions</h2> <div class="faq-grid" data-astro-cid-uw5kdbxl> <div class="faq-item" data-astro-cid-uw5kdbxl> <h3 data-astro-cid-uw5kdbxl>Can I submit my own recipes?</h3> <p data-astro-cid-uw5kdbxl>
Absolutely! We love featuring recipes from our
                            community. Send us your recipe at
                            recipes@recipes-saas.com and we'll review it for
                            publication.
</p> </div> <div class="faq-item" data-astro-cid-uw5kdbxl> <h3 data-astro-cid-uw5kdbxl>How do I print a recipe?</h3> <p data-astro-cid-uw5kdbxl>
On any recipe page, you'll find a print button in
                            the sharing section. This will give you a clean,
                            printer-friendly version.
</p> </div> <div class="faq-item" data-astro-cid-uw5kdbxl> <h3 data-astro-cid-uw5kdbxl>Can I save recipes to my collection?</h3> <p data-astro-cid-uw5kdbxl>
We're working on this feature! In the meantime, you
                            can bookmark pages or subscribe to our newsletter
                            for weekly recipe roundups.
</p> </div> <div class="faq-item" data-astro-cid-uw5kdbxl> <h3 data-astro-cid-uw5kdbxl>Do you offer nutritional information?</h3> <p data-astro-cid-uw5kdbxl>
Yes! Most of our recipes include estimated
                            nutritional information. You'll find it at the
                            bottom of each recipe card.
</p> </div> </div> </div> </section> </main> ` })}  ${renderScript($$result, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/contact.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/contact.astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/contact.astro";
const $$url = "/contact";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$Contact,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
