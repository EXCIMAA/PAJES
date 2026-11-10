import { supabase } from "./supabase";

export const getManualToolContent = async (code: string): Promise<string> => {
  const { data, error } = await supabase
    .from("outils_manuel")
    .select("contenu")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;
  return data?.contenu || "";
};

export const upsertManualToolContent = async ({
  code,
  contenu,
  titre,
  icon = "fa-file-alt",
}: {
  code: string;
  contenu: string;
  titre: string;
  icon?: string;
}) => {
  const { data: existing, error: fetchError } = await supabase
    .from("outils_manuel")
    .select("id, titre, icon")
    .eq("code", code)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const payload: {
    id?: string | number;
    code: string;
    contenu: string;
    titre: string;
    icon: string;
  } = {
    code,
    contenu,
    titre: existing?.titre || titre,
    icon: existing?.icon || icon,
  };

  if (existing?.id) {
    payload.id = existing.id;
  }

  const { data, error } = await supabase
    .from("outils_manuel")
    .upsert(payload, { onConflict: "code" })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};
