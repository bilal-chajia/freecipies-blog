globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead, ag as addAttribute } from '../chunks/astro/server_Bsmdvglz.mjs';
import { $ as $$Layout } from '../chunks/Layout_Cyf8gyLe.mjs';
/* empty css                                */
export { renderers } from '../renderers.mjs';

const $$Faqs = createComponent(($$result, $$props, $$slots) => {
  const siteTitle = "Frequently Asked Questions - Freecipies";
  const siteDescription = "Find answers to common questions about Freecipies, our recipes, and how to use our platform.";
  const faqCategories = [
    {
      title: "General Questions",
      icon: "\u{1F4A1}",
      faqs: [
        {
          question: "What is Freecipies?",
          answer: "Freecipies is a free recipe platform where you can discover delicious, easy-to-follow recipes for every skill level. From quick weeknight dinners to impressive desserts, we make cooking fun and accessible for everyone."
        },
        {
          question: "Is Freecipies really free?",
          answer: "Yes! All our recipes are completely free to access. No subscriptions, no hidden fees. We believe great recipes should be available to everyone."
        },
        {
          question: "How often do you add new recipes?",
          answer: "We add new recipes weekly! Subscribe to our newsletter to get notified when new recipes are published."
        },
        {
          question: "Do I need to create an account?",
          answer: "No account is required to browse and use our recipes. We're working on optional accounts for saving favorites - stay tuned!"
        }
      ]
    },
    {
      title: "Using Recipes",
      icon: "\u{1F373}",
      faqs: [
        {
          question: "How do I print a recipe?",
          answer: "On any recipe page, you'll find a print button in the sharing section near the top. This creates a clean, printer-friendly version without ads or extra content."
        },
        {
          question: "Can I adjust the serving size?",
          answer: "Currently, our recipes show fixed serving sizes. We recommend using a recipe calculator to adjust quantities. This feature is on our roadmap for future updates!"
        },
        {
          question: "Are nutritional values accurate?",
          answer: "Nutritional information is estimated and may vary based on specific ingredients and brands used. For precise dietary needs, we recommend calculating with your exact ingredients."
        },
        {
          question: "What if I'm missing an ingredient?",
          answer: "Many recipes include substitution tips in the notes section. If not, feel free to contact us - we're happy to suggest alternatives!"
        }
      ]
    },
    {
      title: "Dietary & Allergies",
      icon: "\u{1F957}",
      faqs: [
        {
          question: "How do I find vegan or vegetarian recipes?",
          answer: "Use our filter system on the recipes page. Click on tags like 'Vegan' or 'Vegetarian' to see only those recipes. You can also browse our dedicated category pages."
        },
        {
          question: "Do you have gluten-free recipes?",
          answer: "Yes! We have a growing collection of gluten-free recipes. Look for the 'Gluten-Free' tag on recipe cards or filter by this tag on the recipes page."
        },
        {
          question: "Are allergens listed in recipes?",
          answer: "We try to highlight common allergens in our ingredient lists, but always check ingredient labels if you have severe allergies. When in doubt, consult with a healthcare professional."
        }
      ]
    },
    {
      title: "Submissions & Collaboration",
      icon: "\u2728",
      faqs: [
        {
          question: "Can I submit my own recipe?",
          answer: "Absolutely! We love featuring community recipes. Send your recipe to recipes@recipes-saas.com with photos, ingredients, and instructions. Our team will review and may feature it on the site."
        },
        {
          question: "Do you work with brands or sponsors?",
          answer: "We're open to collaborations that align with our values. Contact us at hello@recipes-saas.com with partnership inquiries."
        },
        {
          question: "Can I share your recipes on social media?",
          answer: "Yes! We encourage sharing. Please link back to the original recipe and credit Freecipies. You can use our built-in share buttons for easy sharing."
        },
        {
          question: "How do I report an error in a recipe?",
          answer: "If you spot an error, please let us know via our contact page or email. We appreciate your help in keeping our recipes accurate!"
        }
      ]
    },
    {
      title: "Technical Support",
      icon: "\u{1F527}",
      faqs: [
        {
          question: "The website isn't loading properly. What should I do?",
          answer: "Try refreshing the page or clearing your browser cache. If the problem persists, try a different browser. Still having issues? Contact us with details about your browser and device."
        },
        {
          question: "How do I subscribe to the newsletter?",
          answer: "You can subscribe using the newsletter signup form at the bottom of most pages. Just enter your email and click subscribe!"
        },
        {
          question: "How can I unsubscribe from emails?",
          answer: "Every email we send includes an unsubscribe link at the bottom. Click it to immediately unsubscribe."
        }
      ]
    }
  ];
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": siteTitle, "description": siteDescription, "data-astro-cid-tkjepyjs": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="faq-page" data-astro-cid-tkjepyjs> <!-- Hero Section --> <section class="faq-hero" data-astro-cid-tkjepyjs> <div class="container" data-astro-cid-tkjepyjs> <h1 class="page-title" data-astro-cid-tkjepyjs> <span class="title-dot" data-astro-cid-tkjepyjs></span>
Frequently Asked Questions
</h1> <p class="page-subtitle" data-astro-cid-tkjepyjs>
Everything you need to know about Freecipies. Can't find
                    your answer? <a href="/contact" data-astro-cid-tkjepyjs>Contact us</a> </p> </div> </section> <!-- Quick Jump Navigation --> <section class="quick-nav" data-astro-cid-tkjepyjs> <div class="container" data-astro-cid-tkjepyjs> <div class="nav-pills" data-astro-cid-tkjepyjs> ${faqCategories.map((category, index) => renderTemplate`<a${addAttribute(`#category-${index}`, "href")} class="nav-pill" data-astro-cid-tkjepyjs> <span class="pill-icon" data-astro-cid-tkjepyjs>${category.icon}</span> <span data-astro-cid-tkjepyjs>${category.title}</span> </a>`)} </div> </div> </section> <!-- FAQ Content --> <section class="faq-content" data-astro-cid-tkjepyjs> <div class="container" data-astro-cid-tkjepyjs> ${faqCategories.map((category, catIndex) => renderTemplate`<div class="faq-category"${addAttribute(`category-${catIndex}`, "id")} data-astro-cid-tkjepyjs> <h2 class="category-title" data-astro-cid-tkjepyjs> <span class="category-icon" data-astro-cid-tkjepyjs> ${category.icon} </span> ${category.title} </h2> <div class="faq-list" data-astro-cid-tkjepyjs> ${category.faqs.map((faq, faqIndex) => renderTemplate`<details class="faq-item" data-astro-cid-tkjepyjs> <summary class="faq-question" data-astro-cid-tkjepyjs> <span class="question-text" data-astro-cid-tkjepyjs> ${faq.question} </span> <span class="toggle-icon" data-astro-cid-tkjepyjs> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-tkjepyjs> <path d="M6 9l6 6 6-6" data-astro-cid-tkjepyjs></path> </svg> </span> </summary> <div class="faq-answer" data-astro-cid-tkjepyjs> <p data-astro-cid-tkjepyjs>${faq.answer}</p> </div> </details>`)} </div> </div>`)} </div> </section> <!-- Still Have Questions --> <section class="contact-cta" data-astro-cid-tkjepyjs> <div class="container" data-astro-cid-tkjepyjs> <div class="cta-card" data-astro-cid-tkjepyjs> <h2 data-astro-cid-tkjepyjs>Still Have Questions?</h2> <p data-astro-cid-tkjepyjs>
We're here to help! Reach out to our team and we'll get
                        back to you within 24-48 hours.
</p> <a href="/contact" class="cta-btn" data-astro-cid-tkjepyjs>Contact Us</a> </div> </div> </section> </main> ` })} `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/faqs.astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/faqs.astro";
const $$url = "/faqs";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$Faqs,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
