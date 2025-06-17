import * as Plot from "npm:@observablehq/plot";
import { formatDestination, formatNumber } from "./utils.js"
import { NCR } from "./constants.js";

function totalBars(data, { width, height }){
    const { phTourismFiltered } = data;

    // Filter out provincial data and only keep municipal data
    // Keep only those that are in NCR
    const dataFiltered = phTourismFiltered.filter(d => {
      if(d.province === d.muniCity) {
        if (d.region === NCR) { return true }
        else return false
      }
      else return true
    });

  return Plot.plot({
    marks: [
      Plot.barX(dataFiltered, Plot.groupY(
        {x: "sum"}, 
        {x: "count", y: "", fill: "traveler", sort: {y: "x", reverse: true }, tickFormat: ".2s" })),
        Plot.axisX({
            tickFormat: ".0s",
        }),
      Plot.ruleX([0])
    ],
    marginLeft: 0,
    width,
    color: { legend: true }
  })
}

function topDestBars(data, { width, height }){ 
    const { topDestinations } = data;

  return Plot.plot({
    marginLeft: 150,
    width,
    marks: [
        Plot.barX(
            topDestinations,
          Plot.groupY(
            { x: "sum" },
            { x: "count",
              y: ({ region, province, muniCity }) => formatDestination({ region, province, muniCity }),
              fill: "traveler",
              sort: { y: "x", reverse: true },
              tickFormat: ".0s"
            }
          )
        ),
        // Plot.textX(topDestinations, 
        //   Plot.stackX({
        //     x: "count", 
        //     y: ({ region, province, muniCity }) => formatDestination({ region, province, muniCity }),
        //     text: d => formatNumber(d.count), 
        //     inset: 0.5
        //   })
        // ),
        Plot.axisX({
            tickFormat: ".1s"
        }),
        Plot.axisY({
            textOverflow: "ellipsis",
            lineWidth: 12,
            textAnchor: "end",
        }),
      Plot.frame({ fill: "#ffffff", fillOpacity: 0.05, strokeOpacity: .25 })
    ],
    fx: { padding: 0.2 },
    x: { grid: true }
  })
}

export { totalBars, topDestBars }