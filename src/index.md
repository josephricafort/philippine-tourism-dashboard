---
theme: [ ocean-floor, wide ]
title: Philippine Tourist Destinations - Data Explorer
toc: false
---

```js
import { op } from "npm:arquero"
import { formatNumber, zeroIfNaN, getTripAdvisorUrl, capFirstLetter } from "./components/utils.js"
import { NCR, ALL_REGIONS, GREEN, RED } from "./components/constants.js"
```

```js
// Tourism data for the Philippines
const phTourismLong = FileAttachment("./data/rt_psgc_municity.csv").csv({typed: false})
  .then(data => aq.from(data)
    .objects()
    .map(({count, ...d}) => ({ ...d, count: +count }))
  )
```

```js
const phTourismWide = aq.from(phTourismLong)
  .groupby("year", "id", "region", "province", "muniCity")
  .pivot("traveler", "count")
  .derive({ total: aq.escape(d => d.overseas ? d.domestic + d.foreign + d.overseas : d.domestic + d.foreign ) })
  .orderby("year", "muniCity", "province", "id")
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

function filterbyRegion(data){
  return data.filter(d => 
    checkboxYears.includes(String(d.year)) &&
    (selectRegion === ALL_REGIONS ? true : selectRegion === d.region)
  )
}
```

<!-- PHILIPPINE BUBBLE MAP -->
```js
// TopoJSON data for the Philippines
const philippines = FileAttachment("./data/philippines.json").json({ typed: true })
```

```js
// Data for the map
const nirProvinces = [
    { province: "Negros Occidental", newId: "184500000" },
    { province: "Negros Oriental", newId: "184600000" },
    { province: "Siquijor", newId: "186100000" }
  ]
const nirProvincesMap = new Map(nirProvinces.map(d => [ d.province, d.newId ]))
const nirProvincesOnly = nirProvinces.map(d => d.province)

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
    .derive({
      id: aq.escape(d => nirProvincesOnly.includes(d.properties["NAME_1"]) ? 
                    nirProvincesMap.get(d.properties["NAME_1"]) : d.id)
    })
    // 
    .objects()

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
const phInset = FileAttachment("./data/phInset.json").json({ typed: true })
const phRegionsFile = FileAttachment("./data/regions_nir.json").json({ typed: true })
```

```js
// Inset Philippines Map
const regionsMap = new Map(aq.from(phTourismLong)
  .select("id", "region")
  .derive({ id: aq.escape(d => d.id.substring(0, 2)) })
  .derive({ 
    id: aq.escape(d => d.region === "Negros Island Region (NIR)" ? "18" : d.id ),
    region: aq.escape(d => d.id == "12" ? "Region XII (SOCCSKSARGEN)" : d.region )
  })
  .dedupe()
  .objects()
  .map(d => [d.id, d.region])
)

const phCenter = [122, 12.6]
const phZoom = 9
const phInsetZoom = 5.5
const circleInset = d3.geoCircle().center(phCenter).radius(phInsetZoom).precision(2)()
const currRegionBox = phRegions.features
  .filter(d => selectRegion === "All regions" ? true : regionsMap.get(d.properties["CC_REGION"]) === selectRegion)
  .map((d) => d3.geoBounds(d).flat())
const phNationInset = topojson.feature(phInset, phInset.objects.land)

function mapInsetPh() { 
  return Plot.plot({
    width: 175,
    height: 225,
    projection: {
      type: "mercator",
      domain: circleInset,
      inset: 20
    },
    marks: [
      Plot.geo(phNationInset, { 
        fill: "#777777", 
        fillOpacity: 1
      }),
      Plot.rect(currRegionBox, {
        x1: "0", // or ([x1]) => x1
        y1: "1", // or ([, y1]) => y1
        x2: "2", // or ([,, x2]) => x2
        y2: "3", // or ([,,, y2]) => y2
        stroke: "white",
        strokeWidth: 2,
        fill: "white",
        fillOpacity: 0.15
      }),
    ]
  })
}
```

```js
const phRegions = topojson.feature(phRegionsFile, phRegionsFile.objects.regions_nir)
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

const dataBbPlotTooltip = phTourismWide
        .filter(d => 
          checkboxYears.includes(String(d.year)) &&
          (selectRegion === ALL_REGIONS ? true : selectRegion === d.region))

const bbPlotData = { data: phTourismFiltered, features: phMuniFeatures, checkboxYears, selectRegion }
const bbPlotProvData = { data: phTourismFiltered, features: phProvFeatures, checkboxYears, selectRegion }
const bbPlotTooltipData = { data: dataBbPlotTooltip, features: { phProvFeatures, phMuniFeatures }, checkboxYears, selectRegion }

function mapPh({width, height}) {
  const opacityScale = d3.scaleLinear()
    .domain(d3.extent(d3.map(phTourismFiltered, d => d.count)))
    .range([0.3, 1])

  const range = selectRegion === ALL_REGIONS ? [0, 35] : [0, 50]

  return Plot.plot({
    projection: {
      type: "mercator",
      rotate: [0, 0],
      domain: circle,
      inset: 0
    },
    width,
    height,
    r: { range, aria: false },
    marks: [
        Plot.geo(phRegions.features, {
          fill: d => phRegionsMap.get(d.properties["CC_REGION"]) === selectRegion ? "#555555" : "#333333",
          className: "region-fill"
        }),
        Plot.geo(phProvincesMesh, { 
          stroke: "#222222",
          strokeWidth: 1,
          className: "province-mesh"
        }),

        // Bubble plots
        // bubblePlot(bbPlotData, { fill: "steelblue", fillOpacity: 0.65, tip: false }),
        bubblePlot(bbPlotData, "domestic", { fill: "steelblue", fillOpacity: 0.5, tip: false }),
        bubblePlot(bbPlotData, "foreign", { fill: "orange", fillOpacity: 0.5, tip: false }),
        // Provincial data for some regions
        bubblePlot(bbPlotProvData, "domestic", { fill: "steelblue", fillOpacity: 0.5, tip: false }),
        bubblePlot(bbPlotProvData, "foreign", { fill: "orange", fillOpacity: 0.5, tip: false }),
        bubblePlotTooltip(bbPlotTooltipData, selectRegion, { fill: "pink", fillOpacity: 0 }),
        radiusLegend([0.25, 1, 2], { r: (d) => d * 1e6, title: (d) => `${d}M`}),

        // Location text labels
        Plot.text(phProvFeatures, Plot.centroid({
          text: d => d.properties["NAME_1"],
          fill: "#cccccc",
          stroke: "#333333",
          strokeWidth: 3,
          fontSize: 14,
          fontWeight: 500,
          className: "province-name",
          filter: d => {
            const regId = d.id.substring(0, 2)
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
const checkboxYearsForm = Inputs.checkbox(cbValues, {label: "Filter by year/s", value: cbValues })
const checkboxYears = view(checkboxYearsForm)
// // Disable unticking checkbox when only one remaining variable is available to 
// // prevent unselecting them at the current instance

// const checkboxesTravelers = view(Inputs.checkbox(["foreign", "overseas", "domestic"], {label: "Select travelers", value: ["foreign"]}))
const selectRegionForm = Inputs.select([ALL_REGIONS, ...regions], {label: "Filter region"})
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

import { totalBars, topDestBars, barsTable } from "./components/barCharts.js"

const topDestinations = aq.from(phTourismFiltered)
  .groupby("muniCity", "province")
  .pivot("traveler", "count")
  .derive({ sum: d => d.overseas ? d.domestic + d.foreign + d.overseas : d.domestic + d.foreign })
  .filter(d => d.sum > 0)
  .orderby(aq.desc("sum", "traveler"))
  .slice(0, 50)
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
const radiosTravelerForm = Inputs.radio(["total", "domestic", "foreign"], {label: "Filter by traveler", value: "total"})
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

console.log("topDestChangeLong: ", topDestChangeLong)
```

```js
const dataDestChangeRegion = topDestChangeLong
    .filter(d => (selectRegion === ALL_REGIONS ? true : d.region === selectRegion) &&
           (d.traveler === radiosTraveler))

const [startCount, endCount] = dataDestChangeRegion.reduce((sumArr, d) => {
  if(!isNaN(d.count)){
    const startVal = d.year == "2019" ? sumArr[0] + +d.count : sumArr[0] // If 2019 is unavailable, use 2021 numbers (d.year == "2019" || d.year == "2021")
    const endVal = d.year == "2023" ? sumArr[1] + +d.count : sumArr[1]
    return [startVal, endVal]
  } else return sumArr
}, [0, 0])

const percChange = (endCount - startCount) / startCount
console.log("percChange: ", percChange)

const percChangeOverall = `${percChange > 0 ? "+" : ""}${d3.format(".2s")(percChange * 100)}%`

const styledKeyValue = (child) => htl.html`
  <span style="color: ${percChange > 0 ? GREEN : RED}";>${child}</span>
`
```

```js
import { percDistChart } from "./components/distributionChart.js"
```

```js
// All destinations table
const phTourismLinked = phTourismWide.map(({ muniCity, province, ...d }) => 
      ({ linkedDestination: {
          destination: muniCity !== province ? `${muniCity}, ${province}` : muniCity,
          link: getTripAdvisorUrl({ muniCity, province })
        }, muniCity, province, ...d })) // Add TripAdvisor url link
const searchPhTourism = Inputs.search(phTourismLinked);
const searchPhTourismValue = Generators.input(searchPhTourism);

import { trendsTable, totalTrendsLine } from "./components/trendsTable.js"

const trendsTableData = { topDestinationsChange, topDestChangeLong }
const rangeTop = 10
```

<div class="grid grid-cols-1">
  <div class="grid-rowspan-1 header">
    <h1>🇵🇭 Where Do Most Tourists Go in the Philippines? 🏖️</h1>
    <p>Explore the most popular and trending travel destinations in the Philippines through data. Know which destinations where proven to be popular even in the past and hidden gems that will soon to become a tourist hotspot. See the breakdown for across different regions.</p>
    <div class="select-region-form">${selectRegionForm}</div>
  </div>
</div>
<div class="grid grid-cols-2">
  <div class="grid-colspan-1">
    <div class="card">
      <h2>🌟 Popular Destinations</h2>
      <p>Find the most popular destinations with data combining totals across years ${checkboxYears.join(", ")}</p>
      <div class="grid grid-cols-2">
        <div class=""> ${checkboxYearsForm} </div>
      </div>
      <div class="grid grid-cols-3">
        <div class="card grid-colspan-1">
          <p><span class="key-value">${formatNumber(subTotal)} </span>Travelers</p>
          <p>have visited <span style="font-weight: 700;">${selectRegion}</span> in ${checkboxYears.join(", ")}</p>
          ${resize((width) => totalBars({phTourismFiltered}, {width}))}
          <br />
        </div>
        <div class="card grid-colspan-2">
          <h4>Most Popular Destinations in ${selectRegion}</h4>
          <div class="">
            ${barsTable({ topDestinationsWide, topDestinations }, { resize, region: selectRegion, years: checkboxYears })}
          </div>
        </div>
      </div>
      <div>
        <p>For the totals, only the municipal value level were included while the provincial values were filtered out.</p>
      </div>
    </div>
    <div class="card trending-destinations">
      <h2>📈 Trending Destinations between 2019 and 2023</h2>
      <p>Be the first to discover those trending destinations before they get too crowded!</p>
      ${view(radiosTravelerForm)}
      <div class="grid grid-cols-3">
        <div class="card grid-colspan-1" style="padding-right: 10px;">
          <p>${radiosTraveler === "total" ? "All" : capFirstLetter(radiosTraveler)} travelers to 
            <span style="font-weight: 700;">${selectRegion}</span> has 
            <span>${styledKeyValue(percChange > 0 ? "increased" : "dropped")}</span> by</p>
          <p><span class="key-value">${styledKeyValue(percChangeOverall)}</span></p>
          ${resize((width) => totalTrendsLine({ topDestChangeLong }, selectRegion, radiosTraveler, { width } ))}
        </div>
        <div class="card grid-colspan-2">
          <h4>Most Trending Destinations in ${selectRegion}</h4>
          ${trendsTable(trendsTableData, { resize, selTraveler: radiosTraveler, rangeTop })}
        </div>
      </div>
      <div class="card grid-colspan-1">
        <h4>Distribution on the number of Destination and its equivalent percent change</h4>
        ${resize((width) => percDistChart({ topDestChangeLong }, radiosTraveler, { width } ))}
        <p>The more greens you see, the more arrivals in destinations. The more reds, the more decrease in destinations.</p>
      </div>
    </div>
  </div>  
  <div class="grid-colspan-1">
    <div class="card">
      <h2>🗺️ Map of destinations travelers go in ${selectRegion}</h2>
      <p>The sizes of the circles shows how many travelers have visited the destination. Hover over the circles to see travelers count for every destination.</p>
      <div class="map-ph">
        ${resize((width) => mapPh({width}))}
        ${selectRegion !== ALL_REGIONS ? htl.html`<div class="map-inset-ph">${mapInsetPh()}</div>` : ""}
      </div>
    </div>
    <div class="card notes">
      <h4>Notes</h4>
      <ul>
        <li>While majority of the provinces have data up to the municipal level, some regions only have up to provincial level data.</li>
        <li>Bangsamoro region was not included due to significantly insufficient data</li>
        <li>Municipal data may or may not sum up to Provincial data</li>
        <li>Some destinations like Boracay (Malay, Aklan), Siargao Island (Gen. Luna, Surigao del Norte) and Clark (Angeles City) were encoded in their municipal level data to keep in standard with the released Philippine Standard Geographic Code and joining multiple data would be easier.</li>
      </ul>
    </div>
  </div>
</div>
<div class="card">
  <h2>All Destinations</h2>
  <p>Here's a complete list of all the Philippine destinations with all the values. Every destination links to an external site TripAdvisor. This way, you may check what activities or attractions make travelers visit the destination.</p>
  <br/>
  ${searchPhTourism}
  <br/>
  ${Inputs.table(
    searchPhTourismValue,
    {
      columns: [ "year", "linkedDestination", "region", "id",  "total", "domestic", "foreign", "overseas" ],
      header: {
        year: "Year", id: "PSGC 9-digit Code", region: "Region", total: "Total", 
        domestic: "Domestic", foreign: "Foreign", overseas: "Overseas",
        linkedDestination: "Destination"
      },
      format: {
        linkedDestination: ({ destination, link }) => htl.html`<a href=${link} target="_blank">${destination}</a>`
      },
      layout: "auto"
    }
  )}
</div>

Contact me at josephricafort@gmail.com or see my works at [josephricafort.com](https://josephricafort.com)

<style lang="scss">
  h1, h2, h3, h4, h5, p {
    max-width: 100%;
  }

  h2 { 
    font-size: 1rem !important;
    font-weight: 800 !important;
  }

  .table-container {
    width: 100%;
    height: 100%;
    max-height: 250px;
    overflow-y: auto;

    table {
      position: relative;
      margin: 0;
      table-layout: auto;

      thead {
        position: sticky;
        top: 0;
        background: #111111;
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

  .key-value {
    font-size: 2rem;
  }

  .header {
    .select-region-form {
      form {
        select {
          padding: 5px;
          font-weight: 700;
        }
      }
    }
  }

  .map-ph {
    position: relative;
    margin-top: 0;
    
    .map-inset-ph {
      position: absolute;
      top: 25px;
      left: 25px;
      z-index: 10;
      background-color: black;
      border: 2px solid #333333;
    }
  }

  .top-dest-bars {
    overflow-y: auto;
    max-height: 200px;
  }

  .note {
    font-size: 12px;
  }


</style>