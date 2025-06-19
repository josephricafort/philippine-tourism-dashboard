---
theme: [ ocean-floor, wide ]
title: Philippine Tourist Destinations - Data Explorer
toc: false
---

```js
import { op } from "npm:arquero"
import { formatNumber, zeroIfNaN, getTripAdvisorUrl, capFirstLetter } from "./components/utils.js"
import { NCR, ALL_REGIONS, GREEN, RED } from "./components/constants.js"

import { bubblePlot, bubblePlotTooltip, radiusLegend } from "./components/bubblePlot.js"
import { legendSpike } from "./data/utils.js"
import { totalBars, topDestBars, barsTable } from "./components/barCharts.js"
import { percDistChart } from "./components/distributionChart.js"
import { trendsTable, totalTrendsLine } from "./components/trendsTable.js"
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
const phTourismFiltered = aq.from(phTourismLong)
  .filter(aq.escape(d => 
    checkboxYears.includes(d.year) &&
    (selectRegion === ALL_REGIONS ? true : selectRegion === d.region)
    ))
  // Add together within the same traveler, muniCity and province
  .groupby("id", "region", "muniCity", "province", "traveler")
  .rollup({ count: op.sum("count") })
  .ungroup()
  .objects()
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

// const checkboxesTravelers = view(Inputs.checkbox(["foreign", "overseas", "domestic"], {label: "Select travelers", value: ["foreign"]}))
const selectRegionForm = Inputs.select([ALL_REGIONS, ...regions], {label: "Select region"})
const selectRegion = view(selectRegionForm)

const toggleDistChartForm = Inputs.toggle({ label: "Show how the percentage values are distributed", value: false })
const toggleDistChart = view(toggleDistChartForm)
```

```js
// Bar charts
const phTourismBars = phTourismFiltered
    .filter(d => {
    // Filter out provinces but not NCR cities
    if(!isNaN(d.count)){
      if(d.province != d.muniCity) { return true }
      else if(d.region == NCR) { return true }
      else { return false }
    } else { return false }
  })

const subTotal = phTourismBars
  .reduce((sum, d) => sum + +d.count, 0)

const topDestinationsWide = aq.from(phTourismFiltered)
  // // Add together within the same traveler, muniCity and province
  // .groupby("traveler", "muniCity", "province")
  // .rollup({ count: op.sum("count") })
  .groupby("muniCity", "province")
  .pivot("traveler", "count")
  .ungroup()
  .derive({ total: aq.escape(d => zeroIfNaN(d.domestic) + zeroIfNaN(d.foreign) + zeroIfNaN(d.overseas)) })
  // .filter(d => d.total > 0)
  .orderby(aq.desc("total", "traveler")) 
  .slice(0, 50)
  .objects()

const topDestinations = aq.from(topDestinationsWide)
  .fold(["domestic", "foreign", "overseas"]).rename({ key: "traveler", value: "count" })
  .groupby("muniCity", "province")
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

const percChange = (endCount - startCount) / startCount;
const percChangeOverall = `${percChange > 0 ? "+" : ""}${d3.format(".2s")(percChange * 100)}%`

const styledKeyValue = (child) => htl.html`
  <span style="color: ${percChange > 0 ? GREEN : RED}";>${child}</span>
`
```

```js
const percIncDecData =  dataDestChangeRegion
  .reduce(({ countInc, countDec }, { percChange }) => {
    return { 
      countInc: percChange > 0 ? countInc + 1 : countInc, 
      countDec: percChange < 0 ? countDec + 1 : countDec
    }
  }, { countInc: 0, countDec: 0 })
const { countInc, countDec } = percIncDecData
const percInc = formatNumber((countInc / (countInc + countDec)) * 100)
const percDec = formatNumber((countDec / (countInc + countDec)) * 100)

console.log("percIncDecData: ", percIncDecData)
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

const trendsTableData = { topDestinationsChange, topDestChangeLong }
const rangeTop = 10
```

<div class="grid grid-cols-1 header-container">
  <div class="grid-rowspan-1 header">
    <h1>🇵🇭 Where Do Most Travelers Go in the Philippines? 🏖️</h1>
    <p>Explore the most popular and trending travel destinations in the Philippines using data. Know which destinations where proven to be top favorites for locals and foreign travelers. See the breakdown of trends across different regions. Clicking the destination leads you to TripAdvisor's suggestions of "Things to do".</p>
    <div class="select-region-form">${selectRegionForm}</div>
  </div>
</div>
<div class="grid grid-cols-2">
  <div class="grid-colspan-1">
    <div class="card">
      <h2>🌟 Popular Destinations</h2>
      <p>Know the most popular destinations sorted based from the most traveler counts combined across selected years: ${checkboxYears.join(", ")}.</p>
      <div class="grid grid-cols-2">
        <div class=""> ${checkboxYearsForm} </div>
      </div>
      <div class="grid grid-cols-3">
        <div class="card grid-colspan-1">
          <p><span class="key-value">${formatNumber(subTotal)} </span>visits</p>
          <p>in <span style="font-weight: 700;">${selectRegion}</span> in year/s ${checkboxYears.join(", ")}</p>
          ${resize((width) => totalBars({ phTourismBars }, {width}))}
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
      <p>Be the first to discover trending destinations before they get too crowded. See which destinations show significant drop in visitor numbers.</p>
      ${view(radiosTravelerForm)}
      <div class="grid grid-cols-3">
        <div class="card grid-colspan-1" style="padding-right: 10px;">
          <p>The number of ${radiosTraveler === "total" ? "All" : capFirstLetter(radiosTraveler)} travelers to 
            <span style="font-weight: 700;">${selectRegion}</span> have 
            <span>${styledKeyValue(percChange > 0 ? "increased" : "decreased")}</span> by</p>
          <p><span class="key-value">${styledKeyValue(percChangeOverall)}</span></p>
          ${resize((width) => totalTrendsLine({ topDestChangeLong }, selectRegion, radiosTraveler, { width } ))}
        </div>
        <div class="card grid-colspan-2">
          <h4>Most Trending Destinations in ${selectRegion}</h4>
          ${trendsTable(trendsTableData, { resize, selTraveler: radiosTraveler, rangeTop })}
        </div>
      </div>
      <div class="toggle-dist-chart">${toggleDistChartForm}</div>
      ${toggleDistChart ? html`
        <div class="card grid-colspan-1">
          <h4>In ${selectRegion}, <span class="val-increase">${percInc}%</span> of the destinations have <span class="val-increase">increased</span> in number of travelers while <span class="val-decrease">${percDec}%</span> have seen a <span class="val-decrease">decline</span>.</h4>
          The distribution below shows by how much increase or decrease in travelers these destinations had.
          <br/><br/>
          ${resize((width) => percDistChart({ topDestChangeLong }, radiosTraveler, { width } ))}
        </div>
      ` : ""}
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
      <h4>Notes on the Data</h4>
      <ul>
        <li>While majority of the provinces have data up to the municipal level, some regions only have up to provincial level data.</li>
        <li>Bangsamoro region was not included due to significantly insufficient data</li>
        <li>Municipal data may or may not sum up to Provincial data</li>
        <li>Some destinations like Boracay (Malay, Aklan), Siargao Island (Gen. Luna, Surigao del Norte) and Clark (Angeles City) were encoded in their municipal level data to keep in standard with the released Philippine Standard Geographic Code and joining multiple data would be easier.</li>
      </ul>
      <h4>Data Source</h4>
      <p>Department of Tourism</p>
    </div>
  </div>
</div>
<div class="card">
  <h2>All Destinations</h2>
  <p>Here's a complete list of all the Philippine destinations with all the traveler counts. The link to every destination leads to an external site TripAdvisor. This way, you may check what activities or attractions are available to the destination.</p>
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

For any feedbacks, suggestions or opportunities for collaboration, please send an email at [josephricafort@gmail.com](mailto:josephricafort@gmail.com). Feel free to look at my previous works at [josephricafort.com](https://josephricafort.com)

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

  .header-container {
    /* position: sticky !important;
    top: 20px;
    background: black;
    z-index: 50; */

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
  }

  .map-ph {
    position: relative;
    margin-top: 0;
    
    .map-inset-ph {
      position: absolute;
      top: 15px;
      left: 15px;
      z-index: 10;
      /* background-color: black; */
      /* border: 2px solid #333333; */

      svg {
        filter: drop-shadow(0 0px 16px #000000);
      }
    }
  }

  .top-dest-bars {
    overflow-y: auto;
    max-height: 200px;
  }

  .note {
    font-size: 12px;
  }

  .toggle-dist-chart {
    form {
      label {
        max-width: 300px;
        width: 100%;
      }
    }
  }

  .val-increase { color: #3ca952 }
  .val-decrease { color: #e45756 }


</style>