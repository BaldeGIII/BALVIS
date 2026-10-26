// Smooth scrolling is motion too: honor the OS "reduce motion" setting.
export const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
