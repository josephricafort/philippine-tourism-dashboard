---
theme: dashboard
title: Example dashboard
toc: false
---

# Philippine Regional Tourism arrivals 🏖️

```js
// Tourism data for the Philippines
const phTourismLong = FileAttachment("./data/phTourism.csv").csv({typed: false})
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
        const { year, correspondence_code_mod, region, 
                province, muni_city, traveler, count
                } = d

        return {
            year,
            id: String(correspondence_code_mod),
            region,
            province,
            muniCity: muni_city,
            traveler,
            count: +count
        }
    })
  )
```

```js
const regions = [...new Set(phTourismLong.map(d => d.region))]
```

```js 
const phTourismFiltered = phTourismLong
  .filter(d => 
    checkboxYears.includes(String(d.year)) &&
    checkboxesTravelers.includes(d.traveler) &&
    (selectRegion === "All regions" ? true : selectRegion === d.region)
    )
const phTourismPropsMap = new Map(phTourismFiltered.map((d => [String(d.id), d])))
console.log("phTourismPropsMap: ", phTourismPropsMap)
```

```js
// TopoJSON data for the Philippines
const philippines = FileAttachment("./data/philippines.json").json({ typed: true })
```

```js
const phNation = topojson.feature(philippines, philippines.objects.land)
const phProvinces = new Map(topojson.feature(philippines, philippines.objects.provinces).features.map(d => [d.properties["CC_1"], d]))
const phProvincesMesh = topojson.mesh(philippines, philippines.objects.provinces, (a, b) => a!== b)

const { type, features } = topojson.feature(philippines, philippines.objects.municipalities)
const phMuniFeatures = features.map(f => {
    const {type, properties, geometry} = f
    return { 
      type,
      id: String(properties["CC_2_MOD"]),
      properties,
      geometry
    }
})
console.log("phMuniFeatures: ", phMuniFeatures)
```

```js
// Spike map
import { legendSpike } from "./data/utils.js"
const circle = d3.geoCircle().center([122, 12.6]).radius(9).precision(2)()
function mapPh({width, height}) {
  const opacityScale = d3.scaleLinear()
    .domain(d3.extent(d3.map(phTourismFiltered, d => d.count)))
    .range([0.3, 1])

    return Plot.plot({
      projection: {
          type: "mercator",
          rotate: [0, 0],
          domain: circle,
          inset: 0
      },
      width,
      length: { range: [0, 150] },
      marks: [
          Plot.geo(phNation, { fill: "#333333" }),
          Plot.geo(phProvincesMesh, { stroke: "#777777" }),
          Plot.spike(phMuniFeatures, Plot.centroid({
              stroke: "orange",
              length: d => phTourismPropsMap.get(d.id)?.count,
              opacity: d => opacityScale(phTourismPropsMap.get(d.id)?.count),
              channels: {
                  "town/city": ({ id }) => {
                    // console.log("phMuniFeatures id: ", id)
                    // console.log("Spike data access test: ", phTourismPropsMap.get(id))
                    return `${phTourismPropsMap.get(id)?.muniCity}, ${phTourismPropsMap.get(id)?.province}`
                  },
                  tourist: ({ id }) => phTourismPropsMap.get(id)?.count,
              },
              tip: true
          })),
          legendSpike([2e5, 4e5, 6e5, 8e5, 10e5], {stroke: "orange"}),
          // Plot.dot(phMuniFeatures, Plot.centroid({
          //   r: d => phTourismPropsMap.get(d.id)?.count,
          //   fill: "lightblue",
          //   fillOpacity: 0.15,
          //   stroke: "#fff",
          //   strokeOpacity: 0.25,
          //   geometry: d => d.geometry,
          //   channels: {
          //       "town/city": ({ id }) => `${phTourismPropsMap.get(id)?.muniCity}, ${phTourismPropsMap.get(id)?.province}`,
          //       tourist: ({ id }) => phTourismPropsMap.get(id)?.count,
          //   },
          //   tip: true
          // })),
      ]
  })
}
```

```js
// Inputs and checkboxes
const checkboxYears = view(Inputs.checkbox(["2019", "2021", "2023"], {label: "Select year/s", value: ["2019", "2021", "2023"]}))
const checkboxesTravelers = view(Inputs.checkbox(["foreign", "overseas", "domestic"], {label: "Select travelers", value: ["foreign"]}))
const selectRegion = view(Inputs.select(["All regions", ...regions], {label: "Select region"}))
```

```js
const subTotal = phTourismFiltered.reduce((sum, d) => sum + +d.count, 0)

function travelerBars({width, height}){
  return Plot.plot({
    marks: [
      Plot.barX(phTourismFiltered, Plot.groupY({x: "sum"}, {x: "count", y: "traveler", sort: {y: "x", reverse: true }, fill: "lightblue"})),
      Plot.ruleX([0])
    ],
    marginLeft: 100,
    width
  })
}

import { op } from "npm:arquero"
const topDestinations = aq.from(phTourismFiltered)
  .groupby("muniCity", "province")
  .rollup({ sum: op.sum("count") })
  .orderby(aq.desc("sum"))
  .filter(d => d.sum != 0)
  .objects()
  .slice(0, 7)
```

```js
const searchPhTourism = Inputs.search(phTourismLong);
const searchPhTourismValue = Generators.input(searchPhTourism);
```

<div class="grid grid-cols-3">
  <div class="card">
    <div class="card">
      <h3>Subtotal</h3>
      ${subTotal}
    </div>
    <div class="card">
      <h3>Travelers</h3>
      ${resize((width) => travelerBars({width}))}
    </div>
    <div class="card">
      <h3>Top Destinations</h3>
      ${view(Inputs.table(topDestinations, {
        columns: ["muniCity", "province", "sum"],
        header: { muniCity: "Municipality/City", province: "Province", sum: "Count" }
        }
      ))}
    </div>
  </div>  
  <div class="card grid-colspan-2">
    ${resize((width) => mapPh({width}))}
  </div>
</div>
<div class="card">
  ${searchPhTourism}
  ${Inputs.table(
    searchPhTourismValue, 
    {columns: ["year", "id", "region", "province", "muniCity", "traveler", "count"], 
    header: {year: "Year", id: "ID", region: "Region", muniCity: "Municipality/City", count: "Count"}})}
</div>

<!-- Data: Jonathan C. McDowell, [General Catalog of Artificial Space Objects](https://planet4589.org/space/gcat) -->
