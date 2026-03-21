export const inventoryFilterFieldClassName =
  "min-h-[44px] w-full border border-ink bg-white px-3 py-3 text-xs uppercase tracking-widest leading-none focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2";

export const inventoryFilterLabelClassName = "flex flex-col gap-2";

export const inventoryFilterLabelTextClassName =
  "text-xs uppercase tracking-widest text-stone-500";

export const inventoryButtonBaseClassName =
  "inline-flex min-h-[44px] items-center justify-center border px-4 py-3 text-xs uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-300";

export const inventoryPrimaryButtonClassName = `${inventoryButtonBaseClassName} border-ink bg-ink text-white hover:bg-white hover:text-ink disabled:bg-white`;

export const inventorySecondaryButtonClassName = `${inventoryButtonBaseClassName} border-ink bg-transparent text-ink hover:bg-ink hover:text-white`;

export const inventorySubtleButtonClassName = `${inventoryButtonBaseClassName} border-stone-300 bg-transparent text-stone-500 hover:border-ink hover:text-ink`;

export const inventoryDangerButtonClassName = `${inventoryButtonBaseClassName} border-dahlia-wine bg-dahlia-wine text-white hover:bg-cream hover:text-dahlia-wine disabled:bg-white`;
