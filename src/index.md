---
theme: [ ocean-floor, wide ]
title: Philippine Tourist Destinations - Data Explorer
toc: false
---

```js
import { op } from "npm:arquero"
import { formatNumber, zeroIfNaN } from "./components/utils.js"
import { NCR, ALL_REGIONS } from "./components/constants.js"
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
  .derive({ total: aq.escape(d => d.overseas ? d.domestic + d.foreign + d.overseas : d.domestic + d.foreign ) })
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
    (selectRegion === ALL_REGIONS ? true : selectRegion === d.region)
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
const phProvFeatures = aq.from(phProvinces.features)
    // Make correspondence codes into 9-digit standard
    // First four digits and 5 zeros
    .derive({
      id: d => {
        const provCode = d.properties["CC_1"]
        if (provCode.length == 3) { return `0${provCode}00000` }
        else if (provCode.length == 4) { return `${provCode}00000` }
        else return `${provCode}00000`
      }
    })
    .objects()

// console.log("phProvincesMap: ", phProvincesMap)
const phProvincesMesh = topojson.mesh(philippines, philippines.objects.provinces, (a, b) => a!== b)

const { type, features: muniFeatures } = topojson.feature(philippines, philippines.objects.municipalities)
const phMuniFeatures = muniFeatures.map(f => {
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
if(selectRegion === ALL_REGIONS) {
  circle = d3.geoCircle().center(phCenter).radius(phZoom).precision(2)()
} else {
  const { centerLong, centerLat, zoom } = regCenterZoomMap.get(selectRegion)
  circle = d3.geoCircle().center([centerLong, centerLat]).radius(zoom).precision(2)()
}

const dataBbPlot = phTourismWideLong
        .filter(d => 
          checkboxYears.includes(String(d.year)) &&
          (selectRegion === ALL_REGIONS ? true : selectRegion === d.region))
const dataBbPlotTooltip = phTourismWide
        .filter(d => 
          checkboxYears.includes(String(d.year)) &&
          (selectRegion === ALL_REGIONS ? true : selectRegion === d.region))

const bbPlotData = { data: dataBbPlot, features: phMuniFeatures, checkboxYears, selectRegion }
const bbPlotProvData = { data: dataBbPlot, features: phProvFeatures, checkboxYears, selectRegion }
const bbPlotTooltipData = { data: dataBbPlotTooltip, features: { phProvFeatures, phMuniFeatures }, checkboxYears, selectRegion }

function mapPh({width, height}) {
  const opacityScale = d3.scaleLinear()
    .domain(d3.extent(d3.map(phTourismFiltered, d => d.count)))
    .range([0.3, 1])

  const [maxCount, minCount] = d3.extent(d3.map(dataBbPlot, d => d.count))
  const meanCount = d3.mean(d3.map(dataBbPlot, d => d.count))
  const EXP = 1e6

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
          strokeWidth: 5,
          className: "region"
        }),
        Plot.geo(phProvincesMesh, { 
          stroke: "#222222",
          strokeWidth: 1,
          className: "province-mesh"
        }),
        // Bubble plots
        // bubblePlot(bbPlotData, { fill: "steelblue", fillOpacity: 0.65, tip: false }),
        bubblePlot(bbPlotData, "domestic", { fill: "steelblue", fillOpacity: 0.65, tip: false }),
        bubblePlot(bbPlotData, "foreign", { fill: "orange", fillOpacity: 0.65, tip: false }),
        bubblePlot(bbPlotProvData, "domestic", { fill: "steelblue", fillOpacity: 0.65, tip: false }),
        bubblePlot(bbPlotProvData, "foreign", { fill: "orange", fillOpacity: 0.65, tip: false }),
        bubblePlotTooltip(bbPlotTooltipData, selectRegion, { fill: "pink", fillOpacity: 0 }),
        radiusLegend([0.25, 1, 2], { r: (d) => d * 1e6, title: (d) => `${d}M`}),

        // Location text labels
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
const selectRegionForm = Inputs.select([ALL_REGIONS, ...regions], {label: "Select region"})
const selectRegion = view(selectRegionForm)
```

```js
// Bar charts
const subTotal = phTourismFiltered
  .filter(d => {
    // Filter out provinces but not NCR cities
    if(!isNaN(d.count)){
      if(d.province != d.muniCity) return true
      else if(d.region == NCR) return true
      else false
    } 
  })
  .reduce((sum, d) => sum + +d.count, 0)

import { totalBars, topDestBars } from "./components/barCharts.js"

const topDestinations = aq.from(phTourismFiltered)
  .groupby("muniCity", "province")
  .pivot("traveler", "count")
  .derive({ sum: d => d.overseas ? d.domestic + d.foreign + d.overseas : d.domestic + d.foreign })
  .filter(d => d.sum > 0)
  .orderby(aq.desc("sum", "traveler"))
  .slice(0, 10)
  .fold(["domestic", "foreign", "overseas"]).rename({ key: "traveler", value: "count" })
  .objects()

const topDestinationsWide = aq.from(topDestinations)
  .groupby("muniCity", "province")
  .pivot("traveler", "count")
  .derive({ total: aq.escape(d => zeroIfNaN(d.domestic) + zeroIfNaN(d.foreign) + zeroIfNaN(d.overseas)) })
  .objects()
```

```js
// Trends table, Percent change
const radiosTravelerForm = Inputs.radio(["total", "domestic", "foreign"], {label: "Select traveler", value: "total"})
const radiosTraveler = view(radiosTravelerForm)

const topDestinationsChange = aq.from(phTourismLong)
  .filter(aq.escape(d => selectRegion === ALL_REGIONS ? true : 
                    d.region === selectRegion ))
  .groupby("year", "muniCity", "province", "region")
  .pivot("traveler", "count")
  .derive({ 
    provMuniCity: aq.escape(d => `${d.muniCity}, ${d.province}`),
    total: aq.escape(d => zeroIfNaN(d.domestic) + zeroIfNaN(d.foreign) + zeroIfNaN(d.overseas))
  })
  .groupby("provMuniCity")
  .fold(["domestic", "foreign", "overseas", "total"]).rename({ key: "traveler", value: "count" })
  // Pivot for year, to get perc change
  .groupby("region", "province", "muniCity", "provMuniCity", "traveler")
  .pivot("year", "count")
  .ungroup()
  .rename({ "2019": "year2019", "2021": "year2021", "2023": "year2023" })
  // Derive a percent change between 2019 and 2023
  .derive({ percChange: aq.escape(d => {
    const initCount = !isNaN(d.year2019) ? d.year2019 : d.year2021
    if(d.year2019 == 0) { return 0 }
    return +((d.year2023 - initCount)/Math.abs(initCount + 0.0000000001) * 100).toFixed(2)
    }) })
  .orderby(aq.desc("percChange"))
  // .filter(aq.escape(d => !isNaN(d.percChange) && isFinite(d.percChange)))
  // .filter(aq.escape(d => isFinite(d.percChange)))
  // If at least 2023 data is available while 2019 is NaN, change 2019 data to 0
  .derive({
    year2019: aq.escape(d => !isNaN(d.year2021) && isNaN(d.year2019) ? 0 : d.year2019)
  })
  .filter(aq.escape(d => !isNaN(d.year2019) && !isNaN(d.year2023) ))
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

import { trendsTable } from "./components/trendsTable.js"

const trendsTableData = { topDestinationsChange, topDestChangeLong }
const rangeTop = 10
```

<div class="grid grid-cols-1">
  <div class="grid-rowspan-1">
    <h1>🇵🇭 Where Did All Tourists Go? 🏖️</h1>
    <p>Explore the most popular and trending travel destinations in the Philippines. Source: Department of Tourism.</p>
    ${selectRegionForm}
  </div>
</div>
<div class="grid grid-cols-2">
  <div>
    <div class="card" style="margin-top: 0;">
      <h4>Key Insights</h4>
      <div class="grid grid-cols-2">
        <div>
          ${checkboxYearsForm}
        </div>
      </div>
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
      <h4>Trending Destinations between 2019 and 2023 from ${selectRegion}</h4>
      <br/>
      ${view(radiosTravelerForm)}
      ${trendsTable(trendsTableData, { resize, selTraveler: radiosTraveler, rangeTop })}
    </div>
  </div>  
  <div class="card grid-colspan-1">
    <h4>Distribution of tourists across ${selectRegion}</h4>
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
        background: --theme-foreground;
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

          td.perc-change {
            
          }
        }
      }
    }
  }


</style>