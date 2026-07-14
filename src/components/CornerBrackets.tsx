interface CornerBracketsProps {
  /** Bracket arm length in px. */
  size?: number;
  /** Distance from each edge in px. */
  inset?: number;
}

/** Decorative accent brackets in each corner of the board. */
export function CornerBrackets({ size = 38, inset = 26 }: CornerBracketsProps) {
  const common = 'pointer-events-none absolute border-accent opacity-55';
  const dims = { width: size, height: size };
  return (
    <>
      <div
        className={`${common} border-l-2 border-t-2`}
        style={{ ...dims, top: inset, left: inset }}
      />
      <div
        className={`${common} border-r-2 border-t-2`}
        style={{ ...dims, top: inset, right: inset }}
      />
      <div
        className={`${common} border-b-2 border-l-2`}
        style={{ ...dims, bottom: inset, left: inset }}
      />
      <div
        className={`${common} border-b-2 border-r-2`}
        style={{ ...dims, bottom: inset, right: inset }}
      />
    </>
  );
}
