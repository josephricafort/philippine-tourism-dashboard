---
theme: dashboard
title: Example dashboard
toc: false
---

# Philippine Regional Tourism Arrivals 🏖️

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
const regions = [...new Set(phTourismLong.map(d => d.region))]
```

```js 
const phTourismFiltered = phTourismLong
  .filter(d => 
    checkboxYears.includes(String(d.year)) &&
    // checkboxesTravelers.includes(d.traveler) &&
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
function bubblePlot(selTraveler, { color }){
  const dataPropsMap = new Map(phTourismFiltered
    .filter(d => d.traveler === selTraveler)
    .map((d => [d.id, d])))

  return [ Plot.dot(phMuniFeatures, Plot.centroid({
    r: d => dataPropsMap.get(d.id)?.count,
    fill: color,
    fillOpacity: 0.65,
    stroke: "#ffffff",
    strokeOpacity: 0.65,
    strokeWidth: 0.75,
    geometry: d => d.geometry,
    channels: {
        "town/city": ({ id }) => `${dataPropsMap.get(id)?.muniCity}, ${dataPropsMap.get(id)?.province}`,
        tourist: ({ id }) => dataPropsMap.get(id)?.count,
    },
    tip: true
  }))]
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
          // Plot.spike(phMuniFeatures, Plot.centroid({
          //     stroke: "orange",
          //     length: d => phTourismPropsMap.get(d.id)?.count,
          //     opacity: 0.65, // d => opacityScale(phTourismPropsMap.get(d.id)?.count),
          //     channels: {
          //         "town/city": ({ id }) => {
          //           return `${phTourismPropsMap.get(id)?.muniCity}, ${phTourismPropsMap.get(id)?.province}`
          //         },
          //         tourist: ({ id }) => phTourismPropsMap.get(id)?.count,
          //     },
          //     tip: true
          // })),
          // legendSpike([2e5, 4e5, 6e5, 8e5, 10e5], {stroke: "orange"}),
          bubblePlot("domestic", { color: "steelblue"}),
          bubblePlot("foreign", { color: "orange"}),
          bubblePlot("overseqas", { color: "lightred"}),
      ]
  })
}
```

```js
// Inputs and checkboxes
const checkboxYears = view(Inputs.checkbox(["2019", "2021", "2023"], {label: "Select year/s", value: ["2019", "2021", "2023"]}))
// const checkboxesTravelers = view(Inputs.checkbox(["foreign", "overseas", "domestic"], {label: "Select travelers", value: ["foreign"]}))
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
          y: "muniCity",
          fill: "traveler",
          sort: { y: "x", reverse: true } }
        )
      )
    ],
  })
}
```

```js
// Faceted trends
const topDestTrends = aq.from(topDestinationsWide)
  .select("muniCity", "province")
  .join_left(aq.from(phTourismFiltered)
             .groupby("year", "muniCity", "province")
             .pivot("traveler", "count"))
  .derive({ 
    provMuniCity: aq.escape(d => `${d.muniCity}, ${d.province}`),
    sum: d => d.domestic + d.foreign + d.overseas
  })
  .groupby("provMuniCity")
  .fold(["domestic", "foreign", "overseas"]).rename({ key: "traveler", value: "count" })
  .orderby("year", aq.desc("sum"))
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
const topDestChange = aq.from(topDestinationsWide)
  .select("muniCity", "province")
  .join_left(aq.from(phTourismFiltered)
             .groupby("year", "muniCity", "province")
             .pivot("traveler", "count"))
  .derive({ 
    provMuniCity: aq.escape(d => `${d.muniCity}, ${d.province}`),
    sum: d => d.domestic + d.foreign + d.overseas
  })
  .groupby("provMuniCity")
  .fold(["domestic", "foreign", "overseas"]).rename({ key: "traveler", value: "count" })
  // Pivot for year, to get perc change
  .groupby("province", "muniCity", "provMuniCity", "traveler")
  .pivot("year", "count")
  .ungroup()
  .rename({ "2019": "year2019", "2021": "year2021", "2023": "year2023" })
  // Derive a percent change between 2019 and 2023
  .derive({ percChange: aq.escape(d => +((d.year2023 - d.year2019)/Math.abs(d.year2019 + 0.0000000001) * 100).toFixed(2)) })
  .orderby(aq.desc("percChange"))
  // .filter(aq.escape(d => !isNaN(d.percChange) && isFinite(d.percChange)))
  .objects()

function sparklineDest(traveler, provMuniCity) {
  const data = topDestTrends
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
```

```js
const searchPhTourism = Inputs.search(phTourismLong);
const searchPhTourismValue = Generators.input(searchPhTourism);
```

<div class="grid grid-cols-2">
  <div class="card grid-colspan-1">
    <h2>Summary</h2>
    <div class="card">
      <h3>Total Tourists in ${selectRegion}</h3>
      ${subTotal} Travelers
    </div>
    <div class="card">
      <h3>Breakdown of Total Tourists in ${selectRegion}</h3>
      ${resize((width) => totalBars({width}))}
    </div>
    <div class="card">
      <h3>Top Destinations in ${selectRegion}</h3>
      ${resize((width) => topDestBars({width}))}
      <br />
      ${view(Inputs.table(topDestinationsWide.map((d, i) => ({ ...d, rank: i + 1})), {
        columns: ["muniCity", "province", "foreign", "domestic", "overseas", "total", "rank"],
        header: { rank: "Rank", muniCity: "Municipality/City", province: "Province", 
          foreign: "Foreign", domestic: "Domestic", overseas: "Overseas", total: "Total" }
        }
      ))}
    </div>
    <div class="card">
      <table style="width:100%">
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
          ${topDestChange.filter(d => d.traveler === "domestic")
            .map(({ provMuniCity, traveler, year2019, year2021, year2023, percChange }) => htl.html`<tr>
              <td>${provMuniCity}</td>
              <td>${year2019}</td>
              <td>${year2021}</td>
              <td>${year2023}</td>
              <td>${sparklineDest(traveler, provMuniCity)}</td>
              <td>${percChange > 0 ? `+${percChange}` : percChange }%</td>
            </tr>`)}
        </tbody>
      </table>
    </div>
    <div class="card">
      ${resize((width) => facetedTrends({width}))}
    </div>
  </div>  
  <div class="card grid-colspan-1">
    <h2>Locations</h2>
    <p>Hover over the circles in the map to see the tourist counts.</p>
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
