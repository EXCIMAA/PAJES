// src/hooks/useUnreadCount.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pas d'utilisateur → rien à faire
    if (!user?.id) {
      setCount(0);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // ============================================================
    // Compter les notifications non lues
    // ============================================================
    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (isMounted) {
        setCount(c || 0);
        setLoading(false);
      }
    };

    // ============================================================
    // Init : 1 seule fois par user
    // ============================================================
    const init = async () => {
      // 1. Charger le count initial
      await fetchCount();

      // 2. Supprimer TOUT channel existant (sécurité)
      const channelName = `notifications_count_${user.id}`;
      const existingChannels = supabase.getChannels();
      for (const existing of existingChannels) {
        if (existing.topic === `realtime:${channelName}`) {
          await supabase.removeChannel(existing);
        }
      }

      if (!isMounted) return;

      // 3. Créer UN SEUL channel, chaîner TOUS les .on(), PUIS subscribe
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void fetchCount();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void fetchCount();
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log(`📡 Realtime connecté : ${channelName}`);
          }
        });
    };

    void init();

    // ============================================================
    // Cleanup
    // ============================================================
    return () => {
      isMounted = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  return { count, loading };
}