import { useEffect, useState } from "react";
import { notificationsApi } from "../api/notifications";
import { useAuth } from "../contexts/AuthContext";

const REFRESH_INTERVAL_MS = 30_000;

export function useUnreadCount() {
  const { user, isDemo } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || isDemo) {
      setCount(0);
      setLoading(false);
      return;
    }

    let active = true;
    const fetchCount = async () => {
      try {
        const unreadCount = await notificationsApi.unreadCount();
        if (active) setCount(unreadCount);
      } catch (error) {
        if (active) {
          console.error("Erreur chargement compteur notifications:", error);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchCount();
    const intervalId = window.setInterval(() => void fetchCount(), REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isDemo, user?.id]);

  return { count, loading };
}
