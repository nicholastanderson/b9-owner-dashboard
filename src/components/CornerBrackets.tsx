/** Decorative accent brackets in each corner of the board. */
export function CornerBrackets() {
  const base = 'pointer-events-none absolute h-[38px] w-[38px] opacity-55';
  return (
    <>
      <div className={`${base} left-[26px] top-[26px] border-l-2 border-t-2 border-accent`} />
      <div className={`${base} right-[26px] top-[26px] border-r-2 border-t-2 border-accent`} />
      <div className={`${base} bottom-[26px] left-[26px] border-b-2 border-l-2 border-accent`} />
      <div className={`${base} bottom-[26px] right-[26px] border-b-2 border-r-2 border-accent`} />
    </>
  );
}
