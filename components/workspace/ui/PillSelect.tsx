"use client";

import React from "react";

export type PillOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function PillSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: PillOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={[
        "w-full flex items-center gap-1 rounded-full border border-slate-300 bg-white p-1",
        disabled ? "opacity-60 pointer-events-none" : "",
      ].join(" ")}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled || opt.disabled}
            onClick={() => onChange(opt.value)}
            className={[
              "flex-1 h-8 rounded-full px-3 text-[11px] font-medium transition",
              "border border-transparent",
              active
                ? "bg-slate-100 text-slate-900 border-slate-300 shadow-inner shadow-slate-900/10"
                : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              opt.disabled ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
            title={opt.label}
          >
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}