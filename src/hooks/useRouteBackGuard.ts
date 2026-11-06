import { useEffect, useRef } from 'react';

interface RouteBackGuardOptions {
  /** Whether the back button should currently be trapped / protected */
  isBlocked: boolean;
  /** Custom handler when user clicks browser back button (e.g. step back in wizard, close modal) */
  onBack?: () => void;
  /** Confirmation prompt if user attempts to leave entirely. Default: 'You have unsaved changes in progress. Discard and leave?' */
  confirmMessage?: string;
}

/**
 * Traps browser/device back button navigation while user is in the middle of a form or wizard,
 * preventing sudden accidental page changes and lost progress.
 */
export function useRouteBackGuard({
  isBlocked,
  onBack,
  confirmMessage = 'You have unsaved form progress. Are you sure you want to discard and exit?',
}: RouteBackGuardOptions): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const isBlockedRef = useRef(isBlocked);
  isBlockedRef.current = isBlocked;

  useEffect(() => {
    if (!isBlocked) return;

    // Push a sentinel state to history so back button pops to this entry instead of routing away
    const sentinelState = { __hrms_guard: true, timestamp: Date.now() };
    window.history.pushState(sentinelState, '', window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      if (!isBlockedRef.current) return;

      if (onBackRef.current) {
        // Re-push sentinel state to maintain protection for next action
        window.history.pushState(sentinelState, '', window.location.href);
        onBackRef.current();
      } else {
        const proceed = window.confirm(confirmMessage);
        if (!proceed) {
          // User chose to stay: re-push sentinel state
          window.history.pushState(sentinelState, '', window.location.href);
        } else {
          isBlockedRef.current = false;
          window.history.back();
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isBlockedRef.current) {
        e.preventDefault();
        e.returnValue = confirmMessage;
        return confirmMessage;
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isBlocked, confirmMessage]);
}

