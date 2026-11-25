import { dbApi } from "./apiClient";

type ManualToolRow = {
  id?: string | number;
  code?: string;
  contenu?: string;
  titre?: string;
  icon?: string;
};

export const getManualToolContent = async (code: string): Promise<string> => {
  const rows = await dbApi.list<ManualToolRow>("outils_manuel", {
    filters: { code },
    limit: 500,
  });

  const data = rows.find((row) => row.code === code) ?? null;
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
  const rows = await dbApi.list<ManualToolRow>("outils_manuel", {
    filters: { code },
    limit: 500,
  });

  const existing = rows.find((row) => row.code === code) ?? null;

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
    return dbApi.update("outils_manuel", String(existing.id), payload);
  }

  return dbApi.create("outils_manuel", payload);
};