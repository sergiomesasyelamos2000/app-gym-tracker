import {
  COLUMN_FLEX_STARTED,
  SERIE_ANTERIOR_GAP,
  SET_BADGE,
  getAnteriorColumnStyle,
  getSerieColumnStyle,
} from "../columnConstants";

describe("columnConstants SERIE/ANTERIOR spacing", () => {
  it("gives serie enough flex for the badge on small screens", () => {
    // Rough content width for a ~360px phone with card + row padding.
    const contentWidth = 320;
    const flex = COLUMN_FLEX_STARTED.small;
    const total =
      flex.serie +
      flex.anterior +
      flex.weight +
      flex.reps +
      flex.assisted +
      flex.check;
    const serieWidth = (contentWidth * flex.serie) / total;
    expect(serieWidth).toBeGreaterThan(SET_BADGE.size.small);
  });

  it("adds a started-only gutter on the serie column", () => {
    expect(getSerieColumnStyle(true, true).marginRight).toBe(
      SERIE_ANTERIOR_GAP.small / 2
    );
    expect(getSerieColumnStyle(false, true).marginRight).toBe(
      SERIE_ANTERIOR_GAP.normal / 2
    );
    expect(getSerieColumnStyle(true, false).marginRight).toBeUndefined();
  });

  it("pads anterior away from the serie badge on small and normal screens", () => {
    expect(getAnteriorColumnStyle(true).paddingLeft).toBe(
      SERIE_ANTERIOR_GAP.small
    );
    expect(getAnteriorColumnStyle(false).paddingLeft).toBe(
      SERIE_ANTERIOR_GAP.normal
    );
  });
});
