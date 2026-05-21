  (function () {
    const card = document.querySelector(
      "[data-recipe-card]",
    ) as HTMLElement | null;
    if (!card) return;
    const safeCard = card;

    const slug = card.getAttribute("data-recipe-slug");
    const defaultServings = parseFloat(
      card.getAttribute("data-default-servings") || "4",
    );
    let currentServings = defaultServings;

    // Save button
    const saveBtn = card.querySelector("[data-save-recipe]");
    if (saveBtn) {
      const savedRecipes = JSON.parse(
        localStorage.getItem("savedRecipes") || "[]",
      );
      if (savedRecipes.includes(slug)) saveBtn.classList.add("saved");

      saveBtn.addEventListener("click", function () {
        const saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
        const isSaved = saved.includes(slug);
        if (isSaved) saved.splice(saved.indexOf(slug), 1);
        else saved.push(slug);
        localStorage.setItem("savedRecipes", JSON.stringify(saved));
        saveBtn.classList.toggle("saved", !isSaved);
      });
    }

    // Servings controls
    const servingsDisplay = card.querySelector("[data-servings-display]");

    function formatScaledAmount(num: number): string {
      if (num === 0) return "";

      const whole = Math.floor(num);
      const remainder = num - whole;

      let fractionStr = "";
      if (remainder > 0.01) {
        const frac = Math.round(remainder * 16) / 16;
        if (Math.abs(frac - 0.125) < 0.01) fractionStr = "⅛";
        else if (Math.abs(frac - 0.25) < 0.01) fractionStr = "¼";
        else if (Math.abs(frac - 0.33) < 0.02) fractionStr = "⅓";
        else if (Math.abs(frac - 0.375) < 0.01) fractionStr = "⅜";
        else if (Math.abs(frac - 0.5) < 0.01) fractionStr = "½";
        else if (Math.abs(frac - 0.625) < 0.01) fractionStr = "⅝";
        else if (Math.abs(frac - 0.66) < 0.02) fractionStr = "⅔";
        else if (Math.abs(frac - 0.75) < 0.01) fractionStr = "¾";
        else if (Math.abs(frac - 0.875) < 0.01) fractionStr = "⅞";
        else if (whole === 0)
          fractionStr = remainder
            .toFixed(2)
            .replace(/\.?0+$/, "")
            .replace(/^0/, "");
      }

      if (whole > 0) {
        return fractionStr ? `${whole} ${fractionStr}` : String(whole);
      }
      return fractionStr || "0";
    }

    function formatUnitJS(unit: string, amount: number): string {
      if (!unit) return "";
      if (amount > 1 && !unit.endsWith("s")) {
        const irregulars: Record<string, string> = {
          tbsp: "tbsp",
          tsp: "tsp",
          oz: "oz",
          lb: "lbs",
          cup: "cups",
          can: "cans",
          clove: "cloves",
          slice: "slices",
          piece: "pieces",
          bunch: "bunches",
        };
        return irregulars[unit] || unit + "s";
      }
      return unit;
    }

    function updateServings(newServings: number) {
      currentServings = Math.max(0.1, newServings);
      if (servingsDisplay) {
        servingsDisplay.textContent = formatScaledAmount(currentServings);
        const isChanged = Math.abs(currentServings - defaultServings) > 0.01;
        servingsDisplay.setAttribute("data-changed", isChanged.toString());
      }

      // Also update print overlay servings if present
      const printServingsDisplay = document.querySelector(
        "[data-print-servings]",
      );
      if (printServingsDisplay)
        printServingsDisplay.textContent = formatScaledAmount(currentServings);

      // Scale ingredient amounts (search document to include print overlay)
      const ratio = currentServings / defaultServings;
      document.querySelectorAll("[data-ingredient-amount]").forEach((el) => {
        const amountEl = el as HTMLElement;
        const parent = amountEl.parentElement;
        const unitEl = parent?.querySelector(
          "[data-ingredient-unit]",
        ) as HTMLElement | null;

        const original = parseFloat(
          amountEl.getAttribute("data-original-amount") || "0",
        );
        if (!original || isNaN(original)) return;

        const scaled = original * ratio;
        amountEl.textContent = formatScaledAmount(scaled);

        if (unitEl) {
          const originalUnit = unitEl.getAttribute("data-original-unit") || "";
          unitEl.textContent = formatUnitJS(originalUnit, scaled);
        }
      });

      // Update active preset button
      const presets = safeCard.querySelectorAll(".preset-btn");
      presets.forEach((btn) => btn.classList.remove("active"));

      const eps = 0.01;
      if (Math.abs(currentServings - defaultServings) < eps) {
        safeCard
          .querySelector("[data-servings-default]")
          ?.classList.add("active");
      } else if (Math.abs(currentServings - defaultServings * 2) < eps) {
        safeCard
          .querySelector("[data-servings-double]")
          ?.classList.add("active");
      } else if (Math.abs(currentServings - defaultServings * 3) < eps) {
        safeCard
          .querySelector("[data-servings-triple]")
          ?.classList.add("active");
      } else if (Math.abs(currentServings - defaultServings / 2) < eps) {
        safeCard.querySelector("[data-servings-half]")?.classList.add("active");
      }
    }

    card
      .querySelector("[data-servings-decr]")
      ?.addEventListener("click", function () {
        if (currentServings > 1) updateServings(currentServings - 1);
      });

    card
      .querySelector("[data-servings-incr]")
      ?.addEventListener("click", function () {
        updateServings(currentServings + 1);
      });

    card
      .querySelector("[data-servings-default]")
      ?.addEventListener("click", function () {
        updateServings(defaultServings);
      });

    card
      .querySelector("[data-servings-half]")
      ?.addEventListener("click", function () {
        updateServings(defaultServings / 2);
      });

    card
      .querySelector("[data-servings-double]")
      ?.addEventListener("click", function () {
        updateServings(defaultServings * 2);
      });

    card
      .querySelector("[data-servings-triple]")
      ?.addEventListener("click", function () {
        updateServings(defaultServings * 3);
      });

    // Clear ingredients
    const clearBtn = card.querySelector(
      "[data-clear-ingredients]",
    ) as HTMLElement | null;
    function updateClearBtnVisibility() {
      if (!clearBtn) return;
      const anyChecked = Array.from(
        card?.querySelectorAll("[data-ingredient-check]") || [],
      ).some((c) => (c as HTMLInputElement).checked);
      clearBtn.hidden = !anyChecked;
    }

    // Listen for checkbox changes on ingredients
    card.querySelectorAll("[data-ingredient-check]").forEach(function (check) {
      check.addEventListener("change", updateClearBtnVisibility);
    });

    clearBtn?.addEventListener("click", function () {
      card
        .querySelectorAll("[data-ingredient-check]")
        .forEach(function (check) {
          const input = check as HTMLInputElement;
          input.checked = false;
          // IMPORTANT: Changing .checked in JS doesn't trigger 'change' event
          // and might not update the DOM state visually in some browsers for CSS selectors.
          // Triggering event and removing attribute for maximum compatibility.
          input.removeAttribute("checked");
          input.dispatchEvent(new Event("change"));
        });
      updateClearBtnVisibility();
    });

    // ════════ Cook Mode ════════
    const cookModeToggle = card.querySelector(
      "[data-cook-mode-toggle]",
    ) as HTMLInputElement;
    const cookingMode = card.querySelector("[data-cooking-mode]");
    const closeCookMode = card.querySelector("[data-close-cook-mode]");
    const cookingStepsContainer = card.querySelector("[data-cooking-steps]");
    const progressBar = card.querySelector(
      "[data-progress-bar]",
    ) as HTMLElement;
    const recipeDataEl = card.querySelector("[data-recipe-data]");
    const timerSection = card.querySelector("[data-timer-section]");
    const timerDisplay = card.querySelector("[data-timer-display]");
    const timerStart = card.querySelector("[data-timer-start]");
    const timerPause = card.querySelector("[data-timer-pause]");
    const timerReset = card.querySelector("[data-timer-reset]");
    const ingPanel = card.querySelector("[data-cm-ingredients]");
    const ingList = card.querySelector("[data-cm-ing-list]");
    const ingToggleBtn = card.querySelector("[data-toggle-ingredients]");
    const ingCloseBtn = card.querySelector("[data-close-ingredients]");
    const stepDotsContainer = card.querySelector("[data-step-dots]");
    const btnPrev = card.querySelector("[data-step-prev]");
    const btnNext = card.querySelector("[data-step-next]");
    const progressText = card.querySelector("[data-progress-text]");

    let currentStep = 1;
    let totalSteps = 0;
    let steps: HTMLElement[] = [];
    let timerInterval: ReturnType<typeof setInterval> | null = null;
    let timerSeconds = 0;
    let timerRunning = false;
    let currentStepDuration = 0;
    let wakeLockSentinel: WakeLockSentinel | null = null;

    // ── Duration parser (returns seconds) — EN + FR, ranges, combined h+m ──
    function parseDuration(text: string) {
      if (!text) return 0;
      const t = text.toLowerCase();

      // Combined hours + minutes: "1 hour 30 minutes", "1h30"
      const combined = t.match(
        /(\d+)\s*(?:hours?|hrs?|h|heures?)\s*(?:and\s*|et\s*)?(\d+)\s*(?:minutes?|mins?|m(?:in)?)?/,
      );
      if (combined)
        return (parseInt(combined[1]) * 60 + parseInt(combined[2])) * 60;

      // Range: "10-15 minutes" → average
      const range = t.match(
        /(\d+)\s*(?:-|to|à)\s*(\d+)\s*(minutes?|mins?|hours?|hrs?|heures?|seconds?|secs?|secondes?)/,
      );
      if (range) {
        const avg = Math.round((parseInt(range[1]) + parseInt(range[2])) / 2);
        if (range[3].match(/hours?|hrs?|heures?/)) return avg * 3600;
        if (range[3].match(/seconds?|secs?|secondes?/)) return avg;
        return avg * 60;
      }

      // "for/pendant/environ X unit"
      const forP = t.match(
        /(?:for|pendant|during|environ|about|around)\s*(\d+)\s*(minutes?|mins?|hours?|hrs?|heures?|seconds?|secs?|secondes?)/,
      );
      if (forP) {
        const v = parseInt(forP[1]);
        if (forP[2].match(/hours?|hrs?|heures?/)) return v * 3600;
        if (forP[2].match(/seconds?|secs?|secondes?/)) return v;
        return v * 60;
      }

      // Standalone hours
      const hrs = t.match(/(\d+)\s*(?:hours?|hrs?|heures?)\b/);
      if (hrs) return parseInt(hrs[1]) * 3600;

      // Standalone minutes
      const mins = t.match(/(\d+)\s*(?:minutes?|mins?)\b/);
      if (mins) return parseInt(mins[1]) * 60;

      // Standalone seconds
      const secs = t.match(/(\d+)\s*(?:seconds?|secs?|secondes?)\b/);
      if (secs) return parseInt(secs[1]);

      // Shorthand: 30m, 1h, 90s
      const sh = t.match(/\b(\d+)\s*(h|m|s)\b/);
      if (sh) {
        const v = parseInt(sh[1]);
        if (sh[2] === "h") return v * 3600;
        if (sh[2] === "s") return v;
        return v * 60;
      }

      return 0;
    }

    function formatTimer(s: number) {
      const m = Math.floor(s / 60);
      return String(m).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    }

    function updateTimerDisplay() {
      if (!timerDisplay) return;
      timerDisplay.textContent = formatTimer(timerSeconds);
      timerDisplay.classList.remove("warning", "finished");
      if (timerSeconds <= 0 && currentStepDuration > 0)
        timerDisplay.classList.add("finished");
      else if (timerSeconds <= 30 && currentStepDuration > 0)
        timerDisplay.classList.add("warning");
    }

    function startTimer() {
      if (timerRunning || timerSeconds <= 0) return;
      timerRunning = true;
      timerStart?.setAttribute("hidden", "");
      timerPause?.removeAttribute("hidden");
      timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {
          stopTimer();
          playTimerSound();
        }
      }, 1000);
    }

    function stopTimer() {
      timerRunning = false;
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      timerStart?.removeAttribute("hidden");
      timerPause?.setAttribute("hidden", "");
    }

    function resetTimer() {
      stopTimer();
      timerSeconds = currentStepDuration;
      updateTimerDisplay();
    }

    function playTimerSound() {
      try {
        const ctx = new (
          window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        )();
        // 3-beep pattern
        [0, 0.35, 0.7].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(
            0.01,
            ctx.currentTime + delay + 0.25,
          );
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.25);
        });
      } catch {
        /* audio not supported */
      }
    }

    function setStepTimer(duration: number) {
      currentStepDuration = duration;
      timerSeconds = duration;
      stopTimer();
      if (duration > 0 && timerSection) {
        timerSection.removeAttribute("hidden");
        updateTimerDisplay();
      } else timerSection?.setAttribute("hidden", "");
    }

    // ── Escape-safe text helper ──
    function esc(s: string) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }

    // ── Populate ingredients panel ──
    function populateIngredients(recipe: Record<string, unknown>) {
      if (!ingList) return;
      ingList.innerHTML = "";
      const groups = (recipe?.ingredients as Record<string, unknown>[]) || [];
      groups.forEach((g: Record<string, unknown>) => {
        if (g.group_title) {
          const label = document.createElement("li");
          label.style.cssText =
            "background:transparent;font-weight:700;color:var(--success);font-size:13px;text-transform:uppercase;letter-spacing:.05em;padding:8px 0 4px;pointer-events:none";
          label.textContent = g.group_title as string;
          label.removeAttribute("class"); // no checkbox pseudo
          ingList.appendChild(label);
        }
        ((g.items || []) as Record<string, unknown>[]).forEach((item: Record<string, unknown>) => {
          const li = document.createElement("li");
          const amtStr = item.amount
            ? `<span class="cm-ing-amount">${esc(String(item.amount))}</span>`
            : "";
          const unitStr = item.unit
            ? `<span class="cm-ing-unit">${esc(item.unit)}</span>`
            : "";
          const nameStr = esc(item.name || "");
          const prepStr = item.prep ? `, <em>${esc(item.prep)}</em>` : "";
          li.innerHTML = `<span>${amtStr}${unitStr}${nameStr}${prepStr}</span>`;
          li.addEventListener("click", () => li.classList.toggle("checked"));
          ingList.appendChild(li);
        });
      });
    }

    // ── Build step dots ──
    function buildDots() {
      if (!stepDotsContainer) return;
      stepDotsContainer.innerHTML = "";
      for (let i = 1; i <= totalSteps; i++) {
        const dot = document.createElement("button");
        dot.className = "cm-dot" + (i === 1 ? " active" : "");
        dot.title = "Step " + i;
        dot.addEventListener("click", () => showStep(i));
        stepDotsContainer.appendChild(dot);
      }
    }

    function updateDots() {
      if (!stepDotsContainer) return;
      const dots = stepDotsContainer.querySelectorAll(".cm-dot");
      dots.forEach((d, i) => {
        d.classList.toggle("active", i + 1 === currentStep);
        d.classList.toggle("done", i + 1 < currentStep);
      });
    }

    // ── Init cook mode ──
    function initCookingMode() {
      if (!recipeDataEl || !cookingStepsContainer) return;
      try {
        const raw = recipeDataEl.textContent?.trim() || "{}";
        if (!raw.startsWith("{") && !raw.startsWith("[")) {
          throw new Error("Invalid recipe data format");
        }
        const recipe = JSON.parse(raw);
        const allSteps: Record<string, unknown>[] = [];

        if (recipe.instructions && Array.isArray(recipe.instructions)) {
          recipe.instructions.forEach((section: Record<string, unknown>) => {
            ((section.steps || []) as Record<string, unknown>[]).forEach((s: Record<string, unknown>) => allSteps.push(s));
          });
        } else if (recipe.recipeInstructions) {
          const instr = recipe.recipeInstructions;
          if (Array.isArray(instr)) {
            instr.forEach((s: Record<string, unknown> | string, i: number) => {
              if (typeof s === "string")
                allSteps.push({ text: s, name: "Step " + (i + 1) });
              else if (s.text) allSteps.push(s);
              else if (s.itemListElement)
                (s.itemListElement as Record<string, unknown>[]).forEach((sub: Record<string, unknown>) => allSteps.push(sub));
            });
          } else if (typeof instr === "string")
            allSteps.push({ text: instr, name: "Instructions" });
        }

        totalSteps = allSteps.length;
        if (totalSteps === 0) {
          cookingStepsContainer.innerHTML =
            '<div class="cook-step"><h3>No steps found</h3><p>This recipe has no structured instructions for Cook Mode.</p></div>';
          return;
        }

        // Build step HTML
        const html = allSteps
          .map((step, idx) => {
            const n = idx + 1;
            const dur = step.timer ? step.timer * 60 : parseDuration(step.text);
            const durMin = Math.round(dur / 60);
            return (
              `<div class="cook-step" data-step="${n}" data-duration="${dur}"${n !== 1 ? " hidden" : ""}>` +
              `<div class="step-counter">Step ${n} of ${totalSteps}</div>` +
              `<h3>${esc(step.text)}</h3>` +
              (step.name && !step.name.match(/^Step \d+$/)
                ? `<p>${esc(step.name)}</p>`
                : "") +
              (dur > 0
                ? `<div class="step-timer-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${durMin} min timer</div>`
                : "") +
              (step.tip
                ? `<div class="step-tip"><strong>💡 Tip:</strong> ${esc(step.tip)}</div>`
                : "") +
              `</div>`
            );
          })
          .join("");

        cookingStepsContainer.innerHTML = html;
        steps = Array.from(
          cookingStepsContainer.querySelectorAll(".cook-step"),
        ) as HTMLElement[];

        // Buttons are bound globally now

        // Populate ingredients & dots
        populateIngredients(recipe);
        buildDots();
      } catch (e) {
        console.error("Cook mode init error:", e);
        if (cookingStepsContainer)
          cookingStepsContainer.innerHTML =
            '<div class="cook-step"><h3>Error</h3><p>Could not load recipe.</p></div>';
      }
    }

    function showStep(n: number) {
      if (n < 1 || n > totalSteps) return;
      steps.forEach((s, i) => s.toggleAttribute("hidden", i + 1 !== n));
      currentStep = n;
      const pct = Math.round((n / totalSteps) * 100);
      if (progressBar) progressBar.style.width = pct + "%";
      if (progressText) progressText.textContent = pct + "% Completed";
      updateDots();
      const dur = parseInt(steps[n - 1]?.dataset.duration || "0");
      setStepTimer(dur);

      if (btnPrev) (btnPrev as HTMLButtonElement).disabled = n === 1;
      if (btnNext) {
        if (n === totalSteps) {
          btnNext.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Done</span>';
        } else {
          btnNext.innerHTML =
            '<span>Next Step</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        }
      }
    }

    btnPrev?.addEventListener("click", () => showStep(currentStep - 1));
    btnNext?.addEventListener("click", () => {
      if (currentStep === totalSteps) {
        // Show brief completion feedback before exiting
        if (cookingStepsContainer) {
          cookingStepsContainer.innerHTML =
            '<div class="cook-step"><div class="step-counter" style="font-size:40px;margin-bottom:16px;">🎉</div><h3>All Done!</h3><p>Enjoy your meal!</p></div>';
        }
        if (progressBar) progressBar.style.width = "100%";
        if (progressText) progressText.textContent = "100% Completed";
        setTimeout(() => {
          closeCookMode?.dispatchEvent(new Event("click"));
        }, 1800);
      } else showStep(currentStep + 1);
    });

    // ── Toggle ingredients panel ──
    function toggleIngredients() {
      if (!ingPanel) return;
      const visible = !ingPanel.hasAttribute("hidden");
      if (visible) ingPanel.setAttribute("hidden", "");
      else ingPanel.removeAttribute("hidden");
      ingToggleBtn?.classList.toggle("active", !visible);
    }

    // ── Timer buttons ──
    timerStart?.addEventListener("click", startTimer);
    timerPause?.addEventListener("click", stopTimer);
    timerReset?.addEventListener("click", resetTimer);
    ingToggleBtn?.addEventListener("click", toggleIngredients);
    ingCloseBtn?.addEventListener("click", toggleIngredients);

    // ── Open / Close ──
    // Track the original parent so we can restore the overlay after closing
    let cmOriginalParent: Node | null = null;
    let cmOriginalNext: Node | null = null;

    cookModeToggle?.addEventListener(
      "change",
      function (this: HTMLInputElement) {
        if (this.checked) {
          if (steps.length === 0) initCookingMode();
          // Move overlay to body to escape container-type containing block
          if (cookingMode && cookingMode.parentNode !== document.body) {
            cmOriginalParent = cookingMode.parentNode;
            cmOriginalNext = cookingMode.nextSibling;
            document.body.appendChild(cookingMode);
          }
          cookingMode?.removeAttribute("hidden");
          document.body.style.overflow = "hidden";
          showStep(1);
          // Wake lock
          if ("wakeLock" in navigator) {
            (navigator as any).wakeLock
              .request("screen")
              .then((s: WakeLockSentinel) => {
                wakeLockSentinel = s;
              })
              .catch(() => {});
          }
        } else {
          exitCookMode();
        }
      },
    );

    function exitCookMode() {
      stopTimer();
      cookingMode?.setAttribute("hidden", "");
      document.body.style.overflow = "";
      ingPanel?.setAttribute("hidden", "");
      ingToggleBtn?.classList.remove("active");
      if (cookModeToggle) cookModeToggle.checked = false;
      if (wakeLockSentinel) {
        wakeLockSentinel.release();
        wakeLockSentinel = null;
      }
      // Restore overlay to its original position in the DOM
      if (cookingMode && cmOriginalParent) {
        if (cmOriginalNext) {
          cmOriginalParent.insertBefore(cookingMode, cmOriginalNext);
        } else {
          cmOriginalParent.appendChild(cookingMode);
        }
        cmOriginalParent = null;
        cmOriginalNext = null;
      }
    }

    closeCookMode?.addEventListener("click", exitCookMode);

    // ── Keyboard ──
    document.addEventListener("keydown", (e) => {
      if (cookingMode?.hasAttribute("hidden")) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (currentStep < totalSteps) showStep(currentStep + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentStep > 1) showStep(currentStep - 1);
      } else if (e.key === "Escape") {
        exitCookMode();
      } else if (e.key === "s" || e.key === "S") {
        timerRunning ? stopTimer() : startTimer();
      } else if (e.key === "r" || e.key === "R") {
        resetTimer();
      } else if (e.key === "i" || e.key === "I") {
        toggleIngredients();
      }
    });

    // ── Touch swipe ──
    let touchStartX = 0;
    const overlay = cookingMode as HTMLElement;
    overlay?.addEventListener(
      "touchstart",
      (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
      },
      { passive: true },
    );
    overlay?.addEventListener(
      "touchend",
      (e: TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 60) {
          if (dx < 0 && currentStep < totalSteps) showStep(currentStep + 1);
          else if (dx > 0 && currentStep > 1) showStep(currentStep - 1);
        }
      },
      { passive: true },
    );
  })();