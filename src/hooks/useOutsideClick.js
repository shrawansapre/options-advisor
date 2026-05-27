import { useEffect, useRef } from "react";

export function useOutsideClick(ref, handler, enabled) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!enabled) return;
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) handlerRef.current();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [enabled, ref]);
}
