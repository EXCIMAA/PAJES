// src/pages/Profile/ProfilePage.tsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Phone,
  Building,
  Loader2,
} from "lucide-react";

const Container = styled.div`
  padding: 24px;
  color: #e2e8f0;
  max-width: 800px;
  margin: 0 auto;
`;

const Card = styled.div`
  background: #1e293b;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #334155;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #2d3748;
  &:last-child {
    border-bottom: none;
  }
  svg {
    color: #4facfe;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
  .label {
    color: #94a3b8;
    font-weight: 600;
    width: 140px;
    flex-shrink: 0;
  }
  .value {
    color: #e2e8f0;
    word-break: break-word;
  }
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #2a4f7f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  gap: 12px;
  color: #94a3b8;
`;

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
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "full_name, email, role, department, phone, avatar_url, created_at, hire_date",
          )
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error("Erreur chargement profil:", err);
        // Si le profil n'existe pas, on peut afficher un message
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
      <Container>
        <LoadingContainer>
          <Loader2 className="animate-spin" size={24} />
          Chargement du profil...
        </LoadingContainer>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container>
        <Card>
          <p style={{ color: "#94a3b8" }}>
            Aucun profil trouvé pour cet utilisateur.
          </p>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <Avatar>{getInitials(profile.full_name)}</Avatar>
          <div>
            <Title style={{ marginBottom: 0 }}>Mon profil</Title>
            <p style={{ color: "#94a3b8", marginTop: "4px" }}>
              {profile.role || "Utilisateur"}
            </p>
          </div>
        </div>

        <InfoRow>
          <User size={18} />
          <span className="label">Nom complet</span>
          <span className="value">{profile.full_name || "Non renseigné"}</span>
        </InfoRow>
        <InfoRow>
          <Mail size={18} />
          <span className="label">Email</span>
          <span className="value">{profile.email || "Non renseigné"}</span>
        </InfoRow>
        <InfoRow>
          <Phone size={18} />
          <span className="label">Téléphone</span>
          <span className="value">{profile.phone || "Non renseigné"}</span>
        </InfoRow>
        <InfoRow>
          <Building size={18} />
          <span className="label">Département</span>
          <span className="value">{profile.department || "Non renseigné"}</span>
        </InfoRow>
        <InfoRow>
          <Shield size={18} />
          <span className="label">Rôle</span>
          <span className="value">{profile.role || "Utilisateur"}</span>
        </InfoRow>
        <InfoRow>
          <Calendar size={18} />
          <span className="label">Date d'embauche</span>
          <span className="value">
            {profile.hire_date
              ? new Date(profile.hire_date).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Non renseignée"}
          </span>
        </InfoRow>
        <InfoRow>
          <Calendar size={18} />
          <span className="label">Membre depuis</span>
          <span className="value">
            {profile.created_at
              ? new Date(profile.created_at).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Inconnue"}
          </span>
        </InfoRow>
      </Card>
    </Container>
  );
};
