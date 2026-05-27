export interface TableControlTriggerGuard {
  (): boolean;
  reset: () => void;
  dispose: () => void;
}

export function createTableControlTriggerGuard(onTrigger: () => void): TableControlTriggerGuard {
  let triggered = false;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  const reset = () => {
    triggered = false;
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
  };

  const guard = (() => {
    if (triggered) return false;

    triggered = true;
    onTrigger();
    resetTimer = setTimeout(reset, 120);
    return true;
  }) as TableControlTriggerGuard;

  guard.reset = reset;
  guard.dispose = () => {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
  };

  return guard;
}
