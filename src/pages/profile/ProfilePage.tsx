// src/pages/profile/ProfilePage.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { dbApi } from "../../lib/apiClient";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Phone,
  Building,
  Loader2,
} from "lucide-react";

interface Profile {
  full_name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  avatar_url: string;
  created_at: string;
  hire_date: string;
}

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await dbApi.get<Profile>("profiles", user.id);
        setProfile(data);
      } catch (err) {
        console.error("Erreur chargement profil:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[800px] p-6 text-app-primary">
        <div className="flex items-center justify-center gap-3 p-10 text-app-tertiary">
          <Loader2 className="animate-spin" size={24} />
          Chargement du profil...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-[800px] p-6 text-app-primary">
        <div className="card p-5">
          <p className="text-app-tertiary">
            Aucun profil trouvé pour cet utilisateur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] p-6 text-app-primary">
      <div className="card p-5">
        <div className="mb-5 flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-app-tertiary mb-4 text-3xl font-bold text-app-primary">
            {getInitials(profile.full_name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-app-primary flex items-center gap-3">
              Mon profil
            </h1>
            <p className="mt-1 text-app-tertiary">
              {profile.role || "Utilisateur"}
            </p>
          </div>
        </div>

        {[
          { icon: User, label: "Nom complet", value: profile.full_name || "Non renseigné" },
          { icon: Mail, label: "Email", value: profile.email || "Non renseigné" },
          { icon: Phone, label: "Téléphone", value: profile.phone || "Non renseigné" },
          { icon: Building, label: "Département", value: profile.department || "Non renseigné" },
          { icon: Shield, label: "Rôle", value: profile.role || "Utilisateur" },
          {
            icon: Calendar,
            label: "Date d'embauche",
            value: profile.hire_date
              ? new Date(profile.hire_date).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Non renseignée",
          },
          {
            icon: Calendar,
            label: "Membre depuis",
            value: profile.created_at
              ? new Date(profile.created_at).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Inconnue",
          },
        ].map((row, i, arr) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className={`flex items-center gap-3 py-3 ${
                i === arr.length - 1 ? "" : "border-b border-app"
              }`}
            >
              <Icon size={18} className="text-app-secondary shrink-0" />
              <span className="w-[140px] shrink-0 font-semibold text-app-tertiary">
                {row.label}
              </span>
              <span className="text-app-primary break-words">{row.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
