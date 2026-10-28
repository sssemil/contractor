import { useId } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function TextField({ label, value, onChange, placeholder, multiline = false, required = false, hint, maxLength = 30_000 }: {
  label: string; value: string; onChange: (value: string) => void;
  placeholder?: string; multiline?: boolean; required?: boolean; hint?: string; maxLength?: number;
}) {
  const id = useId();
  const props = { id, value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), placeholder, required, maxLength, className: 'text-input', 'aria-describedby': hint ? id + '-hint' : undefined };
  return <div className="field">
    <label htmlFor={id}>{label}{required && <span className="required"> *</span>}</label>
    {multiline ? <textarea {...props} rows={3} /> : <input {...props} />}
    {hint && <p className="field-hint" id={id + '-hint'}>{hint}</p>}
  </div>;
}

export function SelectField<T extends string>({ label, value, onChange, children, hint }: {
  label: string; value: T; onChange: (value: T) => void; children: ReactNode; hint?: string;
}) {
  const id = useId();
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <div className="select-wrap">
      <select id={id} className="text-input" value={value} onChange={(event) => onChange(event.target.value as T)}
        aria-describedby={hint ? id + '-hint' : undefined}>{children}</select>
      <ChevronDown size={14} aria-hidden />
    </div>
    {hint && <p className="field-hint" id={id + '-hint'}>{hint}</p>}
  </div>;
}
