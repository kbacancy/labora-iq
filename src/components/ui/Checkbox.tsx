"use client";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  name?: string;
};

export const Checkbox = ({ checked, onChange, disabled = false, ariaLabel, name }: CheckboxProps) => {
  return (
    <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        aria-label={ariaLabel}
        name={name}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded-[0.45rem] focus:outline-none disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none inline-flex h-5 w-5 items-center justify-center rounded-[0.45rem] border border-slate-700/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(12,18,32,0.84))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_18px_rgba(0,0,0,0.24)] transition duration-150 peer-hover:border-slate-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400/35 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-950 peer-checked:border-blue-400/70 peer-checked:bg-[linear-gradient(180deg,rgba(77,131,255,0.96),rgba(54,105,236,0.92))] peer-disabled:opacity-55"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="h-3.5 w-3.5 scale-90 text-white opacity-0 transition duration-150 peer-checked:scale-100 peer-checked:opacity-100"
        >
          <path
            d="M3.5 8.1 6.5 11l6-6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
};
