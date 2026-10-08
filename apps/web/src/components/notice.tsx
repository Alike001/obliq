const tones = {
  done: ["notice notice-clear", "glyph glyph-done"],
  hold: ["notice notice-hold", "glyph glyph-attn"],
  stop: ["notice notice-stop", "glyph glyph-stop"],
  info: ["notice", "glyph"],
  hatched: ["notice notice-hatched", "glyph glyph-unknown"],
} as const;

/**
 * A message about the record on this page: a glyph, a heading and a sentence.
 * `live` announces it to a screen reader, for the result of an action.
 */
export function Notice({
  tone = "info",
  title,
  children,
  live = false,
  className,
}: {
  tone?: keyof typeof tones;
  title: string;
  children?: React.ReactNode;
  live?: boolean;
  className?: string;
}) {
  const [box, glyph] = tones[tone];
  return (
    <div
      className={className ? `${box} ${className}` : box}
      role={live ? (tone === "stop" ? "alert" : "status") : "note"}
    >
      <span className={glyph} aria-hidden />
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}
