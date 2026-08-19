import { useCallback, useState } from "react";
import { resolveFrameLogicalWidth } from "../preview/previewContracts";

export interface ContentLogicalWidth {
  readonly ref: (element: HTMLDivElement | null) => undefined | (() => void);
  readonly logicalWidth: number | null;
}

const finite = (value: number): number | null =>
  Number.isFinite(value) && value >= 0 ? value : null;

/** Measure the observed content box only; a missing observer or unusable width fails closed. */
export function useContentLogicalWidth(): ContentLogicalWidth {
  const [logicalWidth, setLogicalWidth] = useState<number | null>(null);

  const ref = useCallback((element: HTMLDivElement | null) => {
    if (element === null) return undefined;
    setLogicalWidth(null);
    if (typeof ResizeObserver !== "function") return undefined;

    const publish = (width: number): void => {
      const measured = finite(width);
      setLogicalWidth(measured === null ? null : resolveFrameLogicalWidth(measured));
    };
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry === undefined) {
        setLogicalWidth(null);
        return;
      }
      const box = Array.isArray(entry.contentBoxSize)
        ? entry.contentBoxSize[entry.contentBoxSize.length - 1]
        : entry.contentBoxSize;
      publish(box?.inlineSize ?? entry.contentRect.width);
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, logicalWidth };
}
