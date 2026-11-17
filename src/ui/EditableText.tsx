import { useState } from "react";
import { Pencil } from "lucide-react";
export default function EditableText({
  value,
  onChange,
  label,
  placeholder,
  className = "",
  maxLength = 200,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  className?: string;
  maxLength?: number;
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(value);
  const finish = () => {
    const next = draft.trim();
    if (next && next !== value) onChange(next);
    setEditing(false);
  };
  return editing ? (
    <input
      className={"editable-input " + className}
      aria-label={label}
      autoFocus
      value={draft}
      maxLength={maxLength}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finish();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setEditing(false);
        }
      }}
    />
  ) : (
    <button
      className={"editable-label " + className}
      aria-label={label}
      title="Clique para editar"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      <span>{value || placeholder}</span>
      <Pencil size={14} />
    </button>
  );
}
