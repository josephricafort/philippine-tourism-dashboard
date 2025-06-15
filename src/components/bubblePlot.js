import * as Plot from "npm:@observablehq/plot";
import { formatNumber, dashIfNaN, getDestination } from "./utils.js"
import * as d3 from "npm:d3";
import { ALL_REGIONS, REGIONS_PROVINCE_TOTALS } from "./constants.js";

function bubblePlot({data, features}, selTraveler, options){
    const dataPropsMap = new Map([...data]
        .filter(d => selTraveler !== "total" ? d.traveler === selTraveler : true)
        .map((d => [d.id, d])))

    return [ Plot.dot(features, Plot.centroid({
        ...options,
        r: d => +dataPropsMap.get(d.id)?.count,
        stroke: "#ffffff",
        strokeOpacity: 0.65,
        strokeWidth: 0.75,
        geometry: d => d.geometry,
        tip: false
    }))]
}

function bubblePlotTooltip({data, features}, selectRegion, options){
    const dataPropsMap = new Map(data.map((d => [d.id, d])))
    const { phProvFeatures, phMuniFeatures } = features

    function tooltipPlot(features){
      return Plot.dot(features, Plot.centroid({
            ...options,
            r: d => +dataPropsMap.get(d.id)?.total, // domestic as the radius anchor that can be hovered
            // fill,
            // fillOpacity,
            stroke: "transparent",
            geometry: d => d.geometry,
            channels: {
                Destination: ({ id }) => getDestination({ 
                  region: dataPropsMap.get(id)?.region,
                  province: dataPropsMap.get(id)?.province,
                  muniCity: dataPropsMap.get(id)?.muniCity, 
                }),
                Total: ({ id }) => formatNumber(dataPropsMap.get(id)?.total),
                Domestic: ({ id }) => formatNumber(dataPropsMap.get(id)?.domestic),
                Foreign: ({ id }) => formatNumber(dataPropsMap.get(id)?.foreign),
                Overseas: ({ id }) => dashIfNaN(formatNumber(dataPropsMap.get(id)?.overseas)),
            },
            tip: true
        }))
    }

    return [ 
        // Tooltip for PROVINCIAL level data
        // Only show if not in "All regions" and if the region is one of the REGIONS_PROVINCE_TOTALS
        selectRegion !== ALL_REGIONS && 
          REGIONS_PROVINCE_TOTALS.includes(selectRegion) && 
          tooltipPlot(phProvFeatures) || null,
        // Tooltip for MUNICIPAL level data
        tooltipPlot(phMuniFeatures),
        Plot.tip(features, Plot.pointer({
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
    dx: 60,
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