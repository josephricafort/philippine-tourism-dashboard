import * as Plot from "npm:@observablehq/plot";
import { formatNumber } from "./utils.js"
import * as d3 from "npm:d3";

function bubblePlot(data, selTraveler, { fill, fillOpacity, tip }){
    const { dataBbPlot, phMuniFeatures, checkboxYears, selectRegion } = data;

    const dataPropsMap = new Map(dataBbPlot
        .filter(d => selTraveler !== "total" ? d.traveler === selTraveler : true)
        .map((d => [d.id, d])))

    return [ Plot.dot(phMuniFeatures, Plot.centroid({
        r: d => dataPropsMap.get(d.id)?.count,
        fill,
        fillOpacity,
        stroke: "#ffffff",
        strokeOpacity: 0.65,
        strokeWidth: 0.75,
        geometry: d => d.geometry,
        // channels: {
        //     Destination: ({ id }) => `${dataPropsMap.get(id)?.muniCity}, ${dataPropsMap.get(id)?.province}`,
        //     Count: ({ id }) => formatNumber(dataPropsMap.get(id)?.count),
        // },
        tip
    }))]
}

function bubblePlotTooltip(data, { fill, fillOpacity, tip }){
    const { dataBbPlotTooltip, phMuniFeatures, checkboxYears, selectRegion } = data;

    const dataPropsMap = new Map(dataBbPlotTooltip.map((d => [d.id, d])))

    return [ 
        Plot.dot(phMuniFeatures, Plot.centroid({
            r: { value: d => dataPropsMap.get(d.id)?.total },
            fill,
            fillOpacity,
            stroke: "transparent",
            strokeOpacity: 0.65,
            geometry: d => d.geometry,
            channels: {
                Destination: ({ id }) => `${dataPropsMap.get(id)?.muniCity}, ${dataPropsMap.get(id)?.province}`,
                Total: ({ id }) => formatNumber(dataPropsMap.get(id)?.total),
                Domestic: ({ id }) => formatNumber(dataPropsMap.get(id)?.domestic),
                Foreign: ({ id }) => formatNumber(dataPropsMap.get(id)?.foreign),
                Overseas: ({ id }) => formatNumber(dataPropsMap.get(id)?.overseas),
            },
            tip
        })),
        Plot.tip(phMuniFeatures, Plot.pointer({
            x: "weight",
            y: "height",
            filter: (d) => d.info,
            title: (d) => [d.name, d.info].join("\n\n")
        }))
    ]
}

function radiusLegend (data, options) {
  return Plot.dot(data, {
    ...options,
    frameAnchor: "top-left",
    strokeWidth: 0.8,
    dx: 40,
    dy: 90,
    render: (i, s, v, d, c, next) => {
      const g = next(i, s, v, d, c);
      d3.select(g)
        .selectAll("circle")
        .each(function (i) {
          const r = +this.getAttribute("r");
          const x = +this.getAttribute("cx");
          const y = +this.getAttribute("cy");
          this.setAttribute("transform", `translate(0,${-r})`);
          const title = d3.select(this).select("title");
          d3.select(g)
            .append("text")
            .attr("x", x)
            .attr("y", y - 2 * r - 4)
            .attr("stroke", "none")
            .attr("fill", "currentColor")
            .text(title.text());
          title.remove();
        });
      return g;
    }
  })
}

export { bubblePlot, bubblePlotTooltip, radiusLegend };