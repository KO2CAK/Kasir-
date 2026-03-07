import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook to handle page visibility changes.
 * When user switches tabs and returns, this hook can refresh data.
 *
 * @param {Function} onVisible - Callback when page becomes visible
 * @param {boolean} enabled - Whether to enable the handler (default: true)
 */
export const useVisibilityHandler = (onVisible, enabled = true) => {
  const isFirstRender = useRef(true);
  const lastVisibility = useRef(document.visibilityState);

  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;

    const isVisible = document.visibilityState === "visible";
    const wasHidden = lastVisibility.current === "hidden";

    // Only trigger onVisible if:
    // 1. Not the first render
    // 2. Page became visible (was hidden, now visible)
    if (!isFirstRender.current && isVisible && wasHidden) {
      onVisible?.();
    }

    lastVisibility.current = document.visibilityState;
    isFirstRender.current = false;
  }, [onVisible, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Mark as not first render after initial mount
    isFirstRender.current = false;
    lastVisibility.current = document.visibilityState;

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange, enabled]);
};

/**
 * Custom hook to safely handle async operations with cleanup.
 * Prevents state updates after component unmounts.
 *
 * @returns {Object} - { isMounted, setMounted }
 */
export const useSafeState = () => {
  const isMounted = useRef(true);

  useEffect(() => {
    // Set mounted to true on mount
    isMounted.current = true;

    // Set mounted to false on unmount
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
};

/**
 * Custom hook to create an AbortController for async operations.
 * Automatically aborts pending requests on unmount.
 *
 * @returns {AbortController} - The abort controller
 */
export const useAbortController = () => {
  const abortControllerRef = useRef(new AbortController());

  useEffect(() => {
    // Create new AbortController on mount
    abortControllerRef.current = new AbortController();

    // Abort on unmount
    return () => {
      abortControllerRef.current.abort();
    };
  }, []);

  return abortControllerRef.current;
};

export default useVisibilityHandler;
