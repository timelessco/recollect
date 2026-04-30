import Link from "next/link";

import { Button } from "@base-ui/react/button";

import type { SingleListData } from "@/types/apiTypes";

import { GeminiAiIcon } from "@/icons/geminiAiIcon";
import { emitClientEvent } from "@/lib/api-helpers/axiom-client-events";

interface SeeSimilarButtonProps {
  bookmark: SingleListData;
}

export function SeeSimilarButton({ bookmark }: SeeSimilarButtonProps) {
  return (
    <Button
      className="flex w-full items-center gap-2 rounded-lg bg-gray-alpha-100 px-4 py-[5.5px] text-13 leading-[115%] font-[450] tracking-[0.13px] whitespace-nowrap text-gray-700 hover:bg-gray-alpha-200"
      render={
        <Link
          href={`/similar/${bookmark.id}`}
          onClick={() => {
            emitClientEvent("similar_click", { bookmark_id: bookmark.id });
          }}
        />
      }
    >
      <span className="flex h-4 w-4 items-center justify-center">
        <GeminiAiIcon />
      </span>
      <span>See similar</span>
    </Button>
  );
}
