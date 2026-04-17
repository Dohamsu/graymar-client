declare module "vivus" {
  type VivusOptions = {
    duration?: number;
    type?: "oneByOne" | "delayed" | "sync" | "scenario" | string;
    start?: "autostart" | "manual" | "inViewport" | string;
    animTimingFunction?: unknown;
    pathTimingFunction?: unknown;
    [key: string]: unknown;
  };

  class Vivus {
    static EASE: unknown;
    static EASE_OUT: unknown;
    static EASE_IN: unknown;
    static EASE_OUT_BOUNCE: unknown;
    static LINEAR: unknown;
    constructor(
      element: Element | string,
      options?: VivusOptions,
      callback?: () => void,
    );
    play(speed?: number): Vivus;
    stop(): Vivus;
    reset(): Vivus;
    finish(): Vivus;
    destroy(): void;
  }

  export default Vivus;
}
