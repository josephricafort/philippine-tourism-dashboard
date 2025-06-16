import * as Plot from "npm:@observablehq/plot";
import { GREEN, RED } from "./constants.js"

function percDistChart({ topDestChangeLong }, traveler, { width } ) {
    const MAX = 500
    const MIN = -100
    const dataFiltered = topDestChangeLong
        .filter(d => d.percChange > MIN && d.percChange < MAX && d.traveler === traveler) // Temp fix for out of svg bounds elements

    return Plot.plot({
        x: { domain: [MIN, MAX] },
        y: { grid: true },
        height: 150,
        width,
        marks: [
            Plot.rectY(dataFiltered,
                Plot.binX(
                    {y: "count"}, {
                        x: "percChange", 
                        y: "count",
                        fill: d => +d.percChange > 0 ? GREEN : RED,
                        interval: 25, // selectRegion !== "All regions" ? 100 : 0
                    })),
            Plot.ruleY([0]),
            Plot.ruleX([0])
        ]
  })
}

export { percDistChart };