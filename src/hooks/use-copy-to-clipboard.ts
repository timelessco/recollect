import { useCallback, useState } from "react";

type CopiedValue = null | string;
type CopyFn = (text: string) => Promise<boolean>;
type ResetFn = () => void;

export function useCopyToClipboard(): [CopiedValue, CopyFn, ResetFn] {
  const [copiedText, setCopiedText] = useState<CopiedValue>(null);

  const copy: CopyFn = useCallback(async (text) => {
    if (!navigator?.clipboard) {
      console.warn("Clipboard not supported");
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      return true;
    } catch (error) {
      console.warn("Copy failed", error);
      setCopiedText(null);
      return false;
    }
  }, []);

  const reset: ResetFn = useCallback(() => {
    setCopiedText(null);
  }, []);

  return [copiedText, copy, reset];
}
