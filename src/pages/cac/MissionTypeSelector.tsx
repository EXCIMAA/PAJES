// src/pages/cac/MissionTypeSelector.tsx
type MissionType = { id: number; code: string; label: string };

const MISSION_TYPES: MissionType[] = [
  { id: 1, code: "AUDIT", label: "Suivi Audit" },
  { id: 2, code: "EXPERTISE", label: "Suivi Expertise" },
];

type Props = {
  selected: number;
  onChange: (id: number) => void;
};

export default function MissionTypeSelector({ selected, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {MISSION_TYPES.map((mt) => (
        <button
          key={mt.id}
          onClick={() => onChange(mt.id)}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            selected === mt.id
              ? "bg-[#1e3a5f] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
          }`}
        >
          {mt.label}
        </button>
      ))}
    </div>
  );
}

export { MISSION_TYPES };
export type { MissionType };
