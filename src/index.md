---
theme: dashboard
title: Philippine Tourist Destinations - Data Explorer
toc: false
---

```js
import { op } from "npm:arquero"
import { formatNumber } from "./components/utils.js"
```

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
const phTourismWide = aq.from(phTourismLong)
  .groupby("year", "id", "region", "province", "muniCity")
  .pivot("traveler", "count")
  .derive({ total: d => d.domestic + d.foreign + d.overseas })
  .orderby("year", "muniCity", "province", "id")
  .objects()

const phTourismWideLong = aq.from(phTourismWide)
  .groupby("year", "id", "region", "province", "muniCity")
  .fold(["domestic", "foreign", "overseas", "total"])
  .rename({
    key: "traveler",
    value: "count"
  })
  .objects()
```

```js
const regions = [...new Set(phTourismLong.map(d => d.region))]
```

```js 
const phTourismFiltered = phTourismLong
  .filter(d => 
    checkboxYears.includes(String(d.year)) &&
    (selectRegion === "All regions" ? true : selectRegion === d.region)
    )
const phTourismPropsMap = new Map(phTourismFiltered.map((d => [String(d.id), d])))
```

```js
// TopoJSON data for the Philippines
const philippines = FileAttachment("./data/philippines.json").json({ typed: true })
```

```js
// Data for the map
const phNation = topojson.feature(philippines, philippines.objects.land)
const phProvinces = topojson.feature(philippines, philippines.objects.provinces)
const phProvincesMap = new Map(phProvinces.features.map(d => [d.properties["CC_1"], d]))
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

// Regional Centers data
const regCenterZoom = FileAttachment("./data/regional-center-zoom.csv").csv({ typed: false })
```

```js
// Philippine Map
import { bubblePlot, bubblePlotTooltip, radiusLegend } from "./components/bubblePlot.js"
import { legendSpike } from "./data/utils.js"
const phRegionsFile = FileAttachment("./data/region.json").json({ typed: true })
```

```js
const phRegions = topojson.feature(phRegionsFile, phRegionsFile.objects.region)
const phRegionsCorrected = [
      ...aq.from(phTourismWide)
        .select("id", "region")
        .derive({ id: aq.escape(d => d.id.substring(0, 2)) })
        .dedupe()
        // Correction for NIR: Remove and added manually
        .filter(d => d.region !== "Negros Island Region (NIR)" && 
                d.region !== "Bangsamoro Autonomous Region In Muslim Mindanao (BARMM)")
        .objects(),
      { id: "18", region: "Negros Island Region (NIR)" },
      { id: "19", region: "Bangsamoro Autonomous Region In Muslim Mindanao (BARMM)" }
    ]
const phRegionsMap = new Map(phRegionsCorrected.map(d => [d.id, d.region]))

const regCenterZoomMap = new Map(regCenterZoom.map(d => [d.region, d]))
const phCenter = [122, 12.6]
const phZoom = 7.7

let circle
if(selectRegion === "All regions") {
  circle = d3.geoCircle().center(phCenter).radius(phZoom).precision(2)()
} else {
  const { centerLong, centerLat, zoom } = regCenterZoomMap.get(selectRegion)
  circle = d3.geoCircle().center([centerLong, centerLat]).radius(zoom).precision(2)()
}

const dataBbPlot = phTourismWideLong
        .filter(d => 
          checkboxYears.includes(String(d.year)) &&
          (selectRegion === "All regions" ? true : selectRegion === d.region))
const dataBbPlotTooltip = phTourismWide
        .filter(d => 
          checkboxYears.includes(String(d.year)) &&
          (selectRegion === "All regions" ? true : selectRegion === d.region))

const bbPlotData = { dataBbPlot, phMuniFeatures, checkboxYears, selectRegion }
const bbPlotTooltipData = { dataBbPlotTooltip, phMuniFeatures, checkboxYears, selectRegion }

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
    height,
    length: { range: [0, 150] },
    marks: [
        // Plot.geo(phNation, { fill: "#333333", className: "nation" }),
        Plot.geo(phRegions.features, {
          fill: d => phRegionsMap.get(d.properties["CC_REG"]) === selectRegion ? "#555555" : "#333333",
          strokeWidth: 2,
          className: "region"
        }),
        Plot.geo(phProvincesMesh, { 
          stroke: "#222222",
          strokeWidth: 1,
          className: "province-mesh"
        }),
        bubblePlot(bbPlotData, "domestic", { fill: "steelblue", fillOpacity: 0.65, tip: false }),
        bubblePlot(bbPlotData, "foreign", { fill: "orange", fillOpacity: 0.65, tip: false }),
        bubblePlot(bbPlotData, "overseaas", { fill: "red", fillOpacity: 0.65, tip: false }),
        bubblePlotTooltip(bbPlotTooltipData, { fill: "pink", tip: true, fillOpacity: 0 }),
        radiusLegend([0.25, 1, 2], { r: (d) => d * 1e6, title: (d) => `${d}M` }),
        Plot.text(phProvinces.features, Plot.centroid({
          text: d => d.properties["NAME_1"],
          fill: "#cccccc",
          stroke: "#333333",
          strokeWidth: 1,
          fontSize: 12,
          className: "province-name",
          filter: d => {
            const id = d.properties["CC_1"]
            const regId = id.length === 3 ? `0${id.substring(0, 1)}` : id.substring(0, 2)
            return phRegionsMap.get(regId) === selectRegion
          }
        })),
    ]
  })
}
```

```js
// Inputs and checkboxes
const cbValues = ["2019", "2021", "2023"]
const checkboxYearsForm = Inputs.checkbox(cbValues, {label: "Select year/s", value: cbValues })
const checkboxYears = view(checkboxYearsForm)
// // Disable unticking checkbox when only one remaining variable is available to 
// // prevent unselecting them at the current instance
// const cbDisabled = checkboxYears.length == 1 ? checkboxYears[0] : ""
// const checkboxYearsFormDisabled = Inputs.checkbox(cbValues, {label: "Select year/s", value: cbValues, disabled: cbDisabled })


// const checkboxesTravelers = view(Inputs.checkbox(["foreign", "overseas", "domestic"], {label: "Select travelers", value: ["foreign"]}))
const selectRegionForm = Inputs.select(["All regions", ...regions], {label: "Select region"})
const selectRegion = view(selectRegionForm)
```

```js
// Bar charts
const subTotal = phTourismFiltered.reduce((sum, d) => sum + +d.count, 0)

import { totalBars, topDestBars } from "./components/barCharts.js"

const topDestinations = aq.from(phTourismFiltered)
  .groupby("muniCity", "province")
  .pivot("traveler", "count")
  .derive({ sum: d => d.domestic + d.foreign + d.overseas })
  .filter(d => d.sum > 0)
  .orderby(aq.desc("sum", "traveler"))
  .slice(0, 9)
  .fold(["domestic", "foreign", "overseas"]).rename({ key: "traveler", value: "count" })
  .objects()

const topDestinationsWide = aq.from(topDestinations)
  .groupby("muniCity", "province")
  .pivot("traveler", "count")
  .derive({ total: d => d.domestic + d.foreign + d.overseas })
  .objects()
```

```js
// Trends table, Percent change
const radiosTravelerForm = Inputs.radio(["total", "domestic", "foreign"], {label: "Select traveler", value: "total"})
const radiosTraveler = view(radiosTravelerForm)

const topDestinationsChange = aq.from(phTourismLong)
  .filter(aq.escape(d => selectRegion === "All regions" ? true : 
                    d.region === selectRegion ))
  .groupby("year", "muniCity", "province")
  .pivot("traveler", "count")
  .derive({ 
    provMuniCity: aq.escape(d => `${d.muniCity}, ${d.province}`),
    total: d => d.domestic + d.foreign + d.overseas
  })
  .groupby("provMuniCity")
  .fold(["domestic", "foreign", "overseas", "total"]).rename({ key: "traveler", value: "count" })
  // Pivot for year, to get perc change
  .groupby("province", "muniCity", "provMuniCity", "traveler")
  .pivot("year", "count")
  .ungroup()
  .rename({ "2019": "year2019", "2021": "year2021", "2023": "year2023" })
  // Derive a percent change between 2019 and 2023
  .derive({ percChange: aq.escape(d => {
    if(d.year2019 === 0) { return 0 }
    return +((d.year2023 - d.year2019)/Math.abs(d.year2019 + 0.0000000001) * 100).toFixed(2)
    }) })
  .orderby(aq.desc("percChange"))
  .filter(aq.escape(d => !isNaN(d.percChange) && isFinite(d.percChange)))
  .groupby("provMuniCity", "traveler")
  .objects()

const topDestChangeLong = aq.from(topDestinationsChange)
  .groupby("province", "muniCity", "provMuniCity")
  .fold(["year2019", "year2021", "year2023"], "count")
  .rename({ key: "year", value: "count" })
  .derive({ year: aq.escape(d => d.year.replaceAll("year", "")) })
  .objects()

const topDestGains = aq.from(topDestinationsChange)
  .orderby(aq.desc("percChange"))
  .objects()
```

```js
// All destinations table
const searchPhTourism = Inputs.search(phTourismWide);
const searchPhTourismValue = Generators.input(searchPhTourism);

import { sparklineDest, trendsTable } from "./components/trendsTable.js"

const trendsTableData = { topDestinationsChange, topDestChangeLong }
const rangeTop = 10
```

<div class="grid grid-cols-1">
  <div class="card grid-rowspan-1">
    <h1>🇵🇭 Where Did All Tourists Go? 🏖️</h1>
    <p>Explore the most popular and trending travel destinations in the Philippines. Source: Department of Tourism.</p>
    ${selectRegionForm}
  </div>
</div>
<div class="grid grid-cols-2">
  <div class="card grid-colspan-1">
    <h2>Key Insights</h2>
    <div class="card">
      <div class="grid grid-cols-2">
        <div>
          <h3>Popular Destinations in ${checkboxYears.join(", ")}</h3>
        </div>
        <div>
          ${checkboxYearsForm}
        </div>
      </div>
      <hr />
      <div class="grid grid-cols-3">
        <div class="grid-colspan-1">
          <h4>Total and Breakdown of Tourists in ${selectRegion}</h4>
          <span style="font-size: 2.5rem;">${formatNumber(subTotal)}</span> Travelers
          <br/><br/>
          ${resize((width) => totalBars({phTourismFiltered}, {width}))}
          <br />
        </div>
        <div class="grid-colspan-2">
          <h4>Top Destinations in ${selectRegion}</h4>
            ${resize((width) => topDestBars({topDestinations}, {width}))}
        </div>
      </div>
    </div>
    <div class="card trending-destinations">
      <h2>Trending Destinations between 2019 and 2023</h2>
      ${view(radiosTravelerForm)}
      <br/>
      <h3>${radiosTraveler} tourists from ${selectRegion}</h3>
      ${trendsTable(trendsTableData, { resize, selTraveler: radiosTraveler, rangeTop })}
    </div>
  </div>  
  <div class="card grid-colspan-1">
    <h2>Destinations Map</h2>
    <p>Hover over the circles in the map to see the tourist counts.</p>
    ${resize((width) => mapPh({width}))}
  </div>
</div>
<div class="card">
  <h2>All Destinations</h2>
  <br/>
  ${searchPhTourism}
  <br/>
  ${Inputs.table(
    searchPhTourismValue, 
    {columns: ["year", "muniCity", "province", "region", "id",  "total", "domestic", "foreign", "overseas"], 
    header: {year: "Year", id: "ID", region: "Region", province: "Province", muniCity: "Destination", 
      total: "Total", domestic: "Domestic", foreign: "Foreign", overseas: "Overseas"}})}
</div>

Want to have something similar? Contact me at josephricafort@gmail.com or see my works at [josephricafort.com](https://josephricafort.com)

<!-- Data: Jonathan C. McDowell, [General Catalog of Artificial Space Objects](https://planet4589.org/space/gcat) -->

<style lang="scss">
  h1, p {
    max-width: 100%;
  }

  h1 { font-size: 2rem }
  h2 { font-size: 1.75rem }
  h3 { font-size: 1.5rem }

  .table-container {
    width: 100%;
    height: 100%;
    max-height: 250px;
    overflow-y: auto;

    table {
      position: relative;

      thead {
        position: sticky;
        top: 0;
        background: #222222;
        z-index: 5 !important;

        tr {
          th.tourist-count,
          th.tourist-perc-change,
          th.sparkline {
            text-align: right;
          }
        }
      }
      tbody {
        td.sparkline {
          svg {
            z-index: 0 !important;
          }
        }

        tr {
          td.tourist-count,
          td.tourist-perc-change,
          td.sparkline {
            text-align: right;
          }
        }
      }
    }
  }


</style>