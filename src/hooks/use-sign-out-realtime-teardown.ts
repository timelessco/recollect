import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import { teardownAllBookmarkEnrichmentSubscriptions } from "@/lib/supabase/realtime/bookmark-enrichment-subscription";

/**
 * Tear down every active bookmark-enrichment Realtime channel when the user
 * signs out. Mount once under the Dashboard tree — the auth listener is
 * long-lived and unsubscribes on unmount.
 */
export function useSignOutRealtimeTeardown(): void {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        void teardownAllBookmarkEnrichmentSubscriptions("auth_error");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
