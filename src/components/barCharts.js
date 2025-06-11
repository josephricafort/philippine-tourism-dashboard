import * as Plot from "npm:@observablehq/plot";

function totalBars(data, { width, height }){
    const { phTourismFiltered } = data;

  return Plot.plot({
    marks: [
      Plot.barX(phTourismFiltered, Plot.groupY(
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
            y: d => `${d.muniCity}, ${d.province}`,
            fill: "traveler",
            sort: { y: "x", reverse: true },
            tickFormat: ".0s"
            }
        )
        ),
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