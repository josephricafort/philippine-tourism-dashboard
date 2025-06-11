import * as Plot from "npm:@observablehq/plot";
import { formatNumber } from "./utils.js"

function bubblePlot(data, selTraveler, { fill, fillOpacity, tip }){
    const { phTourismWideLong, phMuniFeatures, checkboxYears, selectRegion } = data;

    const dataPropsMap = new Map(phTourismWideLong
        .filter(d => 
            checkboxYears.includes(String(d.year)) &&
            (selectRegion === "All regions" ? true : selectRegion === d.region)
        )
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
    const { phTourismWide, phMuniFeatures, checkboxYears, selectRegion } = data;

    const dataPropsMap = new Map(phTourismWide
        .filter(d => 
            checkboxYears.includes(String(d.year)) &&
            (selectRegion === "All regions" ? true : selectRegion === d.region)
        )
        .map((d => [d.id, d])))

    return [ 
        Plot.dot(phMuniFeatures, Plot.centroid({
            r: { value: d => dataPropsMap.get(d.id)?.total },
            fill,
            fillOpacity,
            stroke: "#ffffff",
            strokeOpacity: 0.65,
            strokeWidth: 0.75,
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

export { bubblePlot, bubblePlotTooltip };