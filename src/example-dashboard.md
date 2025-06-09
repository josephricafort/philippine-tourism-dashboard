---
theme: dashboard
title: Example dashboard
toc: false
---

```js
import { op } from "npm:arquero"
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
```

```js
function bubblePlot(selTraveler, { fill, fillOpacity, tip }){
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
    channels: {
        Destination: ({ id }) => `${dataPropsMap.get(id)?.muniCity}, ${dataPropsMap.get(id)?.province}`,
        Count: ({ id }) => dataPropsMap.get(id)?.count,
    },
    tip
  }))]
}

function bubblePlotTooltip(selTraveler, { fill, fillOpacity, tip }){
  const dataPropsMap = new Map(phTourismWide
      .filter(d => 
        checkboxYears.includes(String(d.year)) &&
        (selectRegion === "All regions" ? true : selectRegion === d.region)
      )
      .map((d => [d.id, d])))

  return [ 
    Plot.dot(phMuniFeatures, Plot.centroid({
      r: d => dataPropsMap.get(d.id)?.total,
      fill,
      fillOpacity,
      stroke: "#ffffff",
      strokeOpacity: 0.65,
      strokeWidth: 0.75,
      geometry: d => d.geometry,
      channels: {
          Destination: ({ id }) => `${dataPropsMap.get(id)?.muniCity}, ${dataPropsMap.get(id)?.province}`,
          Total: ({ id }) => dataPropsMap.get(id)?.total,
          Domestic: ({ id }) => dataPropsMap.get(id)?.domestic,
          Foreign: ({ id }) => dataPropsMap.get(id)?.foreign,
          Overseas: ({ id }) => dataPropsMap.get(id)?.overseas,
          r: null
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
```

```js
const regCenterZoom = FileAttachment("./data/regional-center-zoom.csv").csv({ typed: false })
```

```js
import { legendSpike } from "./data/utils.js"
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
      height: 870,
      length: { range: [0, 150] },
      marks: [
          Plot.geo(phNation, { fill: "#333333" }),
          Plot.geo(phProvincesMesh, { stroke: "#777777" }),
          bubblePlot("domestic", { fill: "steelblue", fillOpacity: 0.65, tip: false }),
          bubblePlot("foreign", { fill: "orange", fillOpacity: 0.65, tip: false }),
          bubblePlotTooltip("total", { fill: "pink", tip: true, fillOpacity: 0 }),
      ]
  })
}
```

```js
// Inputs and checkboxes
const checkboxYearsForm = Inputs.checkbox(["2019", "2021", "2023"], {label: "Select year/s", value: ["2019", "2021", "2023"]})
const checkboxYears = view(checkboxYearsForm)
// const checkboxesTravelers = view(Inputs.checkbox(["foreign", "overseas", "domestic"], {label: "Select travelers", value: ["foreign"]}))
const selectRegionForm = Inputs.select(["All regions", ...regions], {label: "Select region"})
const selectRegion = view(selectRegionForm)
```

```js
const subTotal = phTourismFiltered.reduce((sum, d) => sum + +d.count, 0)

function travelerBars({width, height}){
  return Plot.plot({
    marks: [
      Plot.barX(phTourismFiltered, Plot.groupY(
        {x: "sum"}, 
        {x: "count", y: "traveler", sort: {y: "x", reverse: true }, fill: "lightblue"})),
      Plot.ruleX([0])
    ],
    marginLeft: 100,
    width
  })
}

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

function totalBars({ width, height }){
  return Plot.plot({
    marks: [
      Plot.barX(phTourismFiltered, Plot.groupY(
        {x: "sum"}, 
        {x: "count", y: "", fill: "traveler", sort: {y: "x", reverse: true }})),
      Plot.ruleX([0])
    ],
    marginLeft: 0,
    width,
    color: { legend: true }
  })
}

function topDestBars({ width, height }){ 
  return Plot.plot({
    marginLeft: 120,
    width,
    marks: [
      Plot.barX(
        topDestinations,
        Plot.groupY(
          { x: "sum" },
          { x: "count",
            fx: "traveler",
            y: "muniCity",
            fill: "traveler",
            sort: { y: "x", reverse: true } 
          }
        )
      ),
      Plot.frame({ fill: "#ffffff", fillOpacity: 0.05, strokeOpacity: .25 })
    ],
    fx: { padding: 0.2 },
    x: { grid: true }
  })
}
```

```js
// Faceted trends
const topDestTrends = aq.from(topDestinationsWide)
  .select("muniCity", "province")
  .join_left(aq.from(phTourismLong)
             .groupby("year", "muniCity", "province")
             .pivot("traveler", "count"))
  .derive({ 
    provMuniCity: aq.escape(d => `${d.muniCity}, ${d.province}`),
    total: d => d.domestic + d.foreign + d.overseas
  })
  .groupby("provMuniCity")
  .fold(["domestic", "foreign", "overseas", "total"]).rename({ key: "traveler", value: "count" })
  // .orderby("year", aq.desc("count"))
  .objects()

function facetedTrends({ width, height }){
  return Plot.plot((() => {
    const n = 4; // number of facet columns
    const keys = Array.from(d3.union(topDestTrends.map((d) => d.provMuniCity)));
    const index = new Map(keys.map((key, i) => [key, i]));
    const fx = (key) => index.get(key) % n;
    const fy = (key) => Math.floor(index.get(key) / n);

    function getHeight(nElements){
      if(nElements <= 3) return 100
      else if(nElements <= 6) return 200
      else if(nElements <= 9) return 300
      else return 400
    }
    
    return {
      height: getHeight(keys),
      width,
      // axis: { x: null },
      y: {insetTop: 10},
      fx: {padding: 0.10},
      fy: {padding: 0.2},
      marginLeft: 100,
      grid: true,
      marks: [
        Plot.lineY(topDestTrends,  {
          x: d => new Date(d.year, 0, 1),
          y: "count", 
          fx: (d) => fx(d.provMuniCity),
          fy: (d) => fy(d.provMuniCity),
          stroke: "traveler",
          sort: "year"
        }),
        Plot.dot(topDestTrends,  {
          x: d => new Date(d.year, 0, 1),
          y: "count", 
          fx: (d) => fx(d.provMuniCity),
          fy: (d) => fy(d.provMuniCity),
          fill: "traveler",
          sort: "year",
          tip: true
        }),
        Plot.text(keys, {fx, fy, frameAnchor: "top-left", dx: 6, dy: 6}),
        Plot.frame({ strokeOpacity: 0.25 })
      ]
    };
  })())

}
```

```js
// Percent change
// const topDestChange = aq.from(topDestinationsWide)
//   .select("muniCity", "province")
//   .join_left(aq.from(phTourismLong)
//              .groupby("year", "muniCity", "province")
//              .pivot("traveler", "count"))
//   .derive({ 
//     provMuniCity: aq.escape(d => `${d.muniCity}, ${d.province}`),
//     total: d => d.domestic + d.foreign + d.overseas
//   })
//   .groupby("provMuniCity")
//   .fold(["domestic", "foreign", "overseas", "total"]).rename({ key: "traveler", value: "count" })
//   // Pivot for year, to get perc change
//   .groupby("province", "muniCity", "provMuniCity", "traveler")
//   .pivot("year", "count")
//   .ungroup()
//   .rename({ "2019": "year2019", "2021": "year2021", "2023": "year2023" })
//   // Derive a percent change between 2019 and 2023
//   .derive({ percChange: aq.escape(d => {
//     if(d.year2019 === 0) { return 0 }
//     return +((d.year2023 - d.year2019)/Math.abs(d.year2019 + 0.0000000001) * 100).toFixed(2)
//     }) })
//   .orderby(aq.desc("percChange"))
//   .filter(aq.escape(d => !isNaN(d.percChange) && isFinite(d.percChange)))
//   .objects()

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

const rangeTop = 10

const topDestGains = aq.from(topDestinationsChange)
  .orderby(aq.desc("percChange"))
  .objects()

function sparklineDest(topDestChangeLong, traveler, provMuniCity) {
  const data = topDestChangeLong
    .filter(d => d.traveler === traveler && d.provMuniCity === provMuniCity)
  
  return Plot.plot({
    style: {
      display: "inline-block",
      marginBottom: -1,
      overflow: "visible",
      zIndex: 2,
      position: "relative"
    },
    x: { axis: null },
    y: { axis: null },
    width: 50,
    height: 15,
    margin: 1,
    marks: [
      Plot.areaY(data, { x: d => new Date(d.year), y: "count", fillOpacity: 0.1 }),
      Plot.lineY(data, { x: d => new Date(d.year), y: "count", tip: true })
    ]
  })
}

const radiosTravelerForm = Inputs.radio(["total", "domestic", "foreign"], {label: "Select traveler", value: "total"})
const radiosTraveler = view(radiosTravelerForm)
```

```js
const searchPhTourism = Inputs.search(phTourismWide);
const searchPhTourismValue = Generators.input(searchPhTourism);
```
<div class="grid grid-cols-1">
  <div class="card grid-rowspan-1">
    <h1>🇵🇭 Philippine Regional Tourism Arrivals - Data Explorer 🏖️</h1>
    <p>Explore the most popular and trending travel destinations in the Philippines using data from the Department of Tourism.</p>
    ${selectRegionForm}
  </div>
</div>
<div class="grid grid-cols-2">
  <div class="card grid-colspan-1">
    <h2>${selectRegion} Summary</h2>
    <div class="card">
      <h3>Popular Destinations by Total Number of Tourists</h3>
      <br/>
      <div>
        ${checkboxYearsForm}
      </div>
      <br/>
      <div>
        <h4>Total Tourists in ${selectRegion}</h4>
        ${subTotal} Travelers
      </div>
      <br/><br/>
      <h4>Breakdown of Total Tourists in ${selectRegion}</h4>
      ${resize((width) => totalBars({width}))}
      <br />
      <h4>Top Destinations in ${selectRegion}</h4>
      ${resize((width) => topDestBars({width}))}
      <br />
    </div>
    <div class="card trending-destinations">
      <h2>Trending Destinations</h2>
      ${view(radiosTravelerForm)}
      <br/>
      <h3>${radiosTraveler} tourists from ${selectRegion}</h3>
      <div class="table-container">
        ${resize((width) => htl.html`
          <table style="max-width: ${width}px;">
            <thead>
              <tr>
                <th>Destination</th>
                <th>2019</th>
                <th>2021</th>
                <th>2023</th>
                <th>Trend</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              ${topDestinationsChange
                .filter(d => d.traveler === radiosTraveler)
                .slice(0, rangeTop)
                .map(({ provMuniCity, traveler, year2019, year2021, year2023, percChange }) => htl.html`<tr>
                  <td>${provMuniCity}</td>
                  <td>${year2019}</td>
                  <td>${year2021}</td>
                  <td>${year2023}</td>
                  <td>${sparklineDest(topDestChangeLong, traveler, provMuniCity)}</td>
                  <td>${percChange > 0 ? `+${percChange}` : percChange }%</td>
                </tr>`)}
            </tbody>
          </table>
        `)}
      </div>
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
    {columns: ["muniCity", "province", "region", "year", "id",  "total", "domestic", "foreign", "overseas"], 
    header: {year: "Year", id: "ID", region: "Region", province: "Province", muniCity: "Destination", 
      total: "Total", domestic: "Domestic", foreign: "Foreign", overseas: "Overseas"}})}
</div>

Want to have something similar? Contact me at josephricafort@gmail.com or see my works at [josephricafort.com](https://josephricafort.com)

<!-- Data: Jonathan C. McDowell, [General Catalog of Artificial Space Objects](https://planet4589.org/space/gcat) -->

<style>
  h1, p {
    max-width: 100%;
  }

  .table-container {
    width: 100%;
  }
</style>