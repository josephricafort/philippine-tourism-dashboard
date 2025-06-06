import * as aq from "arquero";
import * as topojson from "topojson-client";
import { FileAttachment } from "@observablehq/file-attachments";

// Tourism data for the Philippines
const phTourismLong = FileAttachment("./phTourism.csv").csv()
    .then(data => aq.from(data)
        .rename({
            foreign_travelers: "foreign",
            overseas_filipinos: "overseas",
            domestic_travelers: "domestic"
        })
        .fold(["foreign", "overseas", "domestic"])
        .rename({ key: "traveler", value: "count"})
        .objects()
        .map(d => {
            const { year, correspondence_code_mod, region, province, muni_city,
                    traveler, count
                    } = d

            return {
                year,
                id: correspondence_code_mod,
                region,
                province,
                muniCity: muni_city,
                traveler,
                count: +count
            }
        })
    )

// TopoJSON data for the Philippines
const philippines = FileAttachment("./philippines.json").json()
const phNation = topojson.feature(philippines, philippines.objects.land)
const phProvinces = new Map(topojson.feature(philippines, philippines.objects.provinces).features.map(d => [d.properties["CC_1"], d]))

const {type, features} = topojson.feature(philippines, philippines.objects.municipalities)
const newFeatures = features.map(f => {
    const {type, properties, geometry} = f
    return { 
        type,
        id: properties["CC_2_MOD"],
        properties,
        geometry
    }
})
const phMunicipalities = { type, features: newFeatures }

const phProvincesMesh = topojson.mesh(philippines, philippines.objects.provinces, (a, b) => a!== b)

export {
    phTourismLong,
    philippines,
    phNation,
    phProvinces,
    phMunicipalities,
    phProvincesMesh
}