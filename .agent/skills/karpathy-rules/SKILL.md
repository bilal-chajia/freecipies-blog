---
name: karpathy-rules
description: >
  Behavioral guidelines to reduce common LLM coding mistakes (Think Before Coding,
  Simplicity First, Surgical Changes, Goal-Driven Execution).
  MUST be read at the start of every new conversation.
---

# Karpathy's Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. 

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.

## 4. Goal-Driven Execution

**Define clear success criteria and iterate until met.**

- Transform vague tasks into verifiable outcomes (e.g., "Fix the bug" becomes "Write a test that reproduces it, then make it pass").
- Run tests and verify the logic before declaring success.
