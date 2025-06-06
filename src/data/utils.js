import * as d3 from "npm:d3";
import * as Plot from "npm:@observablehq/plot";

function legendSpike(values, {frameAnchor = "bottom-right", format = "~s", stroke} = {}) {
  if (!Array.isArray(values)) values = Array.from(values);
  if (typeof format !== "function") format = d3.format(format);
  return Plot.marks(
    values.map((v, i) => {
      const dx = (i - values.length) * 30;
      return [
        Plot.spike([v], {
          length: [v],
          dx,
          dy: -20,
          frameAnchor,
          stroke
        }),
        Plot.text([v], {
          text: [format(v)],
          dx,
          dy: -10,
          frameAnchor,
          textAnchor: "middle"
        })
      ];
    })
  );
}

export { legendSpike };