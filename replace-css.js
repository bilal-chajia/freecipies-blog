const fs = require('fs');
const file = 'src/components/RecipeCard.astro';

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

let content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('/* ═══════ PREMIUM COOK MODE ═══════ */');
const endIndex = content.indexOf('/* ── Mobile cook mode ── */');

console.log('startIndex:', startIndex, 'endIndex:', endIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find tags');
  process.exit(1);
}

const newCss = `/* ═══════ PREMIUM COOK MODE ═══════ */
  .cooking-mode-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: #f6f8f7;
    font-family: inherit;
    color: #0f172a;
    min-height: 100vh;
  }
   :global(.dark) .cooking-mode-overlay {
    background-color: #112117;
    color: #f1f5f9;
  }
  .cooking-mode-overlay[hidden] {
    display: none;
  }
  .cm-bg-image {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(to bottom, rgba(17, 33, 23, 0.8), rgba(17, 33, 23, 0.95)), var(--cm-bg, url(''));
    background-size: cover;
    background-position: center;
    z-index: 1;
  }
  .cm-content-wrap {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }
  
  /* Progress Bar Area */
  .cm-progress-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 48px 24px 24px 24px;
  }
  .cm-progress-header {
    display: flex;
    gap: 24px;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .cm-progress-label {
    color: #33e67a;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0;
  }
  .cm-progress-text {
    color: #94a3b8;
    font-size: 12px;
    font-weight: 500;
    margin: 0;
  }
  .cm-progress-track {
    border-radius: 9999px;
    background-color: rgba(30, 41, 59, 0.5);
    height: 6px;
    overflow: hidden;
  }
  .cm-progress-fill {
    height: 100%;
    border-radius: 9999px;
    background-color: #33e67a;
    transition: width 0.3s ease;
  }

  /* Top Navigation Bar */
  .cm-top-nav {
    display: flex;
    align-items: center;
    padding: 24px;
    justify-content: space-between;
  }
  .cm-top-titles {
    display: flex;
    flex-direction: column;
  }
  .cm-top-title {
    color: #f1f5f9;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.02em;
    margin: 0;
  }
  .cm-top-subtitle {
    color: #33e67a;
    font-size: 14px;
    font-weight: 500;
    margin: 0;
  }
  .cm-close-btn {
    display: flex;
    height: 40px;
    width: 40px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background-color: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(51, 65, 85, 0.5);
    color: #f1f5f9;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .cm-close-btn:hover {
    background-color: rgba(51, 65, 85, 0.5);
  }
  
  /* Main Content */
  .cm-main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 32px;
    text-align: center;
  }
  
  /* Pagination Dots */
  .cm-dots {
    display: flex;
    width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 32px;
  }
  .cm-dot {
    height: 6px;
    width: 6px;
    border-radius: 9999px;
    background-color: #334155;
    transition: all 0.2s;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .cm-dot.active {
    background-color: #33e67a;
    width: 32px;
  }
  .cm-dot.done {
    background-color: #33e67a;
  }
  
  /* Step Details */
  .cm-steps-container {
    width: 100%;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .cook-step {
    animation: cmFadeIn 0.3s ease-out;
  }
  .cook-step[hidden] {
    display: none;
  }
  .step-counter {
    color: #33e67a;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 16px;
    opacity: 0.8;
  }
  .cook-step h3 {
    color: #f1f5f9;
    font-size: 30px;
    font-weight: 700;
    line-height: 1.25;
    margin-bottom: 48px;
    max-width: 448px;
    margin-left: auto;
    margin-right: auto;
  }
  .cook-step p {
    color: #94a3b8;
    font-size: 18px;
    margin-bottom: 24px;
  }
  @keyframes cmFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  /* Sophisticated Timer */
  .glass-panel {
    background: rgba(17, 33, 23, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(51, 230, 122, 0.1);
  }
  .cm-timer-panel {
    padding: 32px;
    border-radius: 24px;
    width: 100%;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    margin: 0 auto 32px auto;
  }
  .cm-timer-panel[hidden] {
    display: none;
  }
  .cm-timer-label {
    color: #94a3b8;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .cm-timer-display {
    font-size: 60px;
    font-weight: 300;
    color: #f1f5f9;
    margin-bottom: 24px;
    letter-spacing: -0.05em;
  }
  .cm-timer-display.warning {
    color: #f59e0b;
  }
  .cm-timer-display.finished {
    color: #ef4444;
    animation: cmPulse 1s infinite;
  }
  @keyframes cmPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .cm-timer-controls {
    display: flex;
    gap: 16px;
    width: 100%;
  }
  .cm-timer-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 0;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }
  .cm-timer-btn svg { width: 18px; height: 18px; }
  .cm-timer-btn-stop {
    border: 1px solid #334155;
    color: #cbd5e1;
    background: transparent;
  }
  .cm-timer-btn-stop:hover { background: rgba(30, 41, 59, 0.5); }
  .cm-timer-btn-start {
    background: #33e67a;
    color: #112117;
    font-weight: 700;
  }
  .cm-timer-btn-start:hover { box-shadow: 0 0 20px rgba(51, 230, 122, 0.4); }
  .cm-timer-btn[hidden] { display: none; }
  
  /* Floating Bottom Navigation */
  .cm-bottom-nav-wrap {
    padding: 24px 24px 40px 24px;
    position: absolute;
    bottom: 0px;
    left: 0;
    width: 100%;
  }
  .cm-bottom-nav {
    border-radius: 16px;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    border-color: rgba(255, 255, 255, 0.05);
  }
  .cm-nav-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 0;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    border: none;
    background: transparent;
  }
  .cm-nav-btn svg { width: 20px; height: 20px; }
  .cm-nav-btn.prev {
    color: #94a3b8;
  }
  .cm-nav-btn.prev:hover:not([disabled]) { color: #e2e8f0; }
  .cm-nav-btn.prev[disabled] { opacity: 0.3; cursor: not-allowed; }
  
  .cm-nav-btn.items {
    color: #e2e8f0;
  }
  .cm-nav-btn.items:hover { background: rgba(255, 255, 255, 0.05); }
  
  .cm-nav-btn.next {
    background: #33e67a;
    color: #112117;
    font-weight: 700;
    box-shadow: 0 10px 15px -3px rgba(51, 230, 122, 0.1);
  }
  .cm-nav-btn.next:hover { box-shadow: 0 10px 15px -3px rgba(51, 230, 122, 0.3); }
  
  .cm-nav-divider {
    width: 1px;
    height: 32px;
    background-color: rgba(51, 65, 85, 0.5);
    margin: 0 8px;
  }

  /* Ingredients Slide-over */
  .cm-ingredients {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 400px;
    z-index: 50;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }
  .cm-ingredients:not([hidden]) {
    transform: translateX(0);
  }
  .cm-ingredients-inner {
    padding: 32px 24px;
    height: 100%;
    overflow-y: auto;
  }
  .cm-ingredients-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }
  .cm-ingredients-header h3 {
    margin: 0;
    font-size: 20px;
    color: #f1f5f9;
    font-weight: 700;
  }
  .cm-btn-close-ing {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
  }
  .cm-btn-close-ing:hover { color: #f1f5f9; }
  .cm-ing-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .cm-ing-list li {
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    color: #f1f5f9;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .cm-ing-list li:hover { background: rgba(255, 255, 255, 0.1); }
  .cm-ing-list li.checked { opacity: 0.5; }
  .cm-ing-amount { color: #33e67a; font-weight: 700; margin-right: 4px; }
  .cm-ing-unit { color: #94a3b8; margin-right: 4px; }
  
`;

content = content.substring(0, startIndex) + newCss + "\n  " + content.substring(endIndex);
fs.writeFileSync(file, content, 'utf8');
console.log('CSS replaced');
