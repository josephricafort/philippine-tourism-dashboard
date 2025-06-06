import * as Plot from "npm:@observablehq/plot";
import * as topojson from "topojson-client";
import * as d3 from "npm:d3";

export function phProvinces(shape, {width, height}) {
    const provinces = topojson.feature(shape, shape.objects.provinces)
    const circle = d3.geoCircle().center([122, 12.6]).radius(9).precision(2)()

    return Plot.plot({
        width,
        height,
        projection: {
            type: "mercator",
            rotate: [0, 0],
            domain: circle,
            inset: 0
        },
        marks: [
            Plot.geo(provinces, {stroke: "white"}),
            Plot.geo(circle, {stroke: "red", strokeWidth: 0}),
        ]
    })
}

export function mapPh({width, height}) {
    return Plot.plot({
        projection: {
                    type: "mercator",
                    rotate: [0, 0],
                    domain: circle,
                    inset: 0
                },
        width: 975,
        length: { range: [0, 100] },
        marks: [
            Plot.geo(phNation, { fill: "#e0e0e0" }),
            Plot.geo(phProvincesMesh, { stroke: "white" }),
            Plot.spike(phMunicipalities.features, Plot.centroid({
                stroke: "darkblue", 
                length: d => phTourismPropsMap.get(d.id)?.count,
                channels: {
                    "town/city": ({ id }) => `${phTourismPropsMap.get(id)?.muniCity}, ${phTourismPropsMap.get(id)?.province}`,
                    tourist: ({ id }) => phTourismPropsMap.get(id)?.count,
                },
                tip: true
            })),
            legendSpike([2e5, 4e5, 6e5, 8e5, 10e5], {stroke: "darkblue"})
        ]
    })
}