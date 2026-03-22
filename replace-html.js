const fs = require('fs');
const file = 'src/components/RecipeCard.astro';

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

let content = fs.readFileSync(file, 'utf8');

const htmlStartStr = '{/* ═══ Premium Cooking Mode Overlay ═══ */}';
const htmlEndStr = '      <script';

let htmlStart = content.indexOf(htmlStartStr);
let htmlEnd = content.indexOf(htmlEndStr, htmlStart);

if (htmlStart === -1 || htmlEnd === -1) {
  console.error('Cannot find HTML bounds');
  process.exit(1);
}

const newHtml = `{/* ═══ Exact Stitch Cooking Mode Overlay ═══ */}
      <div class="cooking-mode-overlay" data-cooking-mode hidden>
        <div class="cm-bg-image" data-cm-bg-image style={\`--cm-bg: url('\${coverImage.imageUrl}')\`}></div>
        <div class="cm-content-wrap">
          
          {/* Progress Bar Area */}
          <div class="cm-progress-area">
            <div class="cm-progress-header">
              <p class="cm-progress-label">Progress</p>
              <p class="cm-progress-text" data-progress-text>0% Completed</p>
            </div>
            <div class="cm-progress-track">
              <div class="cm-progress-fill" data-progress-bar style="width: 0%;"></div>
            </div>
          </div>

          {/* Top Navigation Bar */}
          <div class="cm-top-nav">
            <div class="cm-top-titles">
              <h2 class="cm-top-title">{article.headline}</h2>
              <span class="cm-top-subtitle">Cook Mode</span>
            </div>
            <button class="cm-close-btn" data-close-cook-mode title="Exit cook mode (Esc)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Main Content (Step Details) */}
          <div class="cm-main-content">
            {/* Pagination Dots */}
            <div class="cm-dots" data-step-dots></div>
            
            <div class="cm-steps-container" data-cooking-steps></div>

            {/* Sophisticated Timer Component */}
            <div class="cm-timer-panel glass-panel" data-timer-section hidden>
              <span class="cm-timer-label">Resting Timer</span>
              <div class="cm-timer-display" data-timer-display>00:00</div>
              <div class="cm-timer-controls">
                <button class="cm-timer-btn cm-timer-btn-stop" data-timer-pause hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  Stop
                </button>
                <button class="cm-timer-btn cm-timer-btn-start" data-timer-start>
                  <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Start
                </button>
              </div>
            </div>
          </div>

          {/* Floating Bottom Navigation */}
          <div class="cm-bottom-nav-wrap">
            <div class="cm-bottom-nav glass-panel">
              <button class="cm-nav-btn prev" data-step-prev disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                <span>Previous</span>
              </button>
              <div class="cm-nav-divider"></div>
              <button class="cm-nav-btn items" data-toggle-ingredients>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                <span>Ingredients</span>
              </button>
              <button class="cm-nav-btn next" data-step-next>
                <span>Next Step</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>

          {/* Slide-over Ingredients Panel */}
          <aside class="cm-ingredients glass-panel" data-cm-ingredients hidden>
            <div class="cm-ingredients-inner">
              <div class="cm-ingredients-header">
                <h3>Ingredients</h3>
                <button type="button" class="cm-btn-close-ing" data-toggle-ingredients>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <ul class="cm-ing-list" data-cm-ing-list></ul>
            </div>
          </aside>
        </div>
      </div>

`;

content = content.substring(0, htmlStart) + newHtml + content.substring(htmlEnd);
fs.writeFileSync(file, content, 'utf8');
console.log('HTML Replaced');
