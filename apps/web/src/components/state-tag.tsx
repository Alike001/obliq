import { stateLabel, stateTone, type Tone } from "./state-tone";

const glyphs: Record<Tone, string> = {
  clear: "glyph glyph-done",
  ready: "glyph",
  hold: "glyph glyph-wait",
  stop: "glyph glyph-stop",
  neutral: "glyph",
};

/** State tag for an obligation or settlement: a glyph, a tint and the word. */
export function StateTag({ state }: { state: string }) {
  const tone = stateTone(state);
  return (
    <span className={tone === "neutral" ? "tag" : `tag tag-${tone}`}>
      <span className={glyphs[tone]} aria-hidden />
      {stateLabel(state)}
    </span>
  );
}
