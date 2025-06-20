import * as Plot from "npm:@observablehq/plot";
import { GREEN, RED } from "./constants.js"

function percDistChart({ topDestChangeLong }, traveler, { width } ) {
    const MAX = 500
    const MIN = -100
    const dataFiltered = topDestChangeLong
        // Temp fix for out of svg bounds elements
        // Shows only one instance (there are 2 other, 2019 and 2021), solves the issue of duplicates values
        .filter(d => (d.percChange > MIN && d.percChange < MAX && d.traveler === traveler) && d.year === "2023") 
        

    return Plot.plot({
        x: { domain: [MIN, MAX], label: "% Change range" },
        y: { grid: true, label: "Destination count" },
        height: 150,
        width,
        marks: [
            Plot.rectY(dataFiltered,
                Plot.binX(
                    { y: "count"}, {
                        x: "percChange", 
                        y: "count",
                        fill: d => +d.percChange > 0 ? GREEN : RED,
                        interval: 20,
                        tip: true
                    })),
            Plot.ruleY([0]),
            Plot.ruleX([0]),
        ]
  })
}

export { percDistChart };