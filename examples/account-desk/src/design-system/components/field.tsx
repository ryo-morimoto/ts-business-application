import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type Common = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

export function Field({
  id,
  label,
  error,
  hint,
  required,
  className = "",
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold text-desk-text">
        {label}
        {required ? <span className="text-desk-danger"> *</span> : null}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        className={[
          "border bg-desk-surface px-2 py-1.5 text-sm text-desk-text",
          "rounded-[var(--radius-control)]",
          error ? "border-desk-danger" : "border-desk-border",
        ].join(" ")}
        {...rest}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-desk-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-desk-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  error,
  hint,
  required,
  className = "",
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold text-desk-text">
        {label}
        {required ? <span className="text-desk-danger"> *</span> : null}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        className={[
          "min-h-20 border bg-desk-surface px-2 py-1.5 text-sm text-desk-text",
          "rounded-[var(--radius-control)]",
          error ? "border-desk-danger" : "border-desk-border",
        ].join(" ")}
        {...rest}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-desk-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-desk-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  id,
  label,
  error,
  hint,
  required,
  children,
  className = "",
  ...rest
}: Common &
  React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold text-desk-text">
        {label}
        {required ? <span className="text-desk-danger"> *</span> : null}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        className={[
          "border bg-desk-surface px-2 py-1.5 text-sm text-desk-text",
          "rounded-[var(--radius-control)]",
          error ? "border-desk-danger" : "border-desk-border",
        ].join(" ")}
        {...rest}
      >
        {children}
      </select>
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-desk-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-desk-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
