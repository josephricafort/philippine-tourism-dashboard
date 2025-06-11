import * as Plot from "npm:@observablehq/plot";
import  { html } from "npm:htl";
import { formatNumber } from "./utils.js";

// import "./trendsTable.css"

function trendsTable(data, {resize, selTraveler, rangeTop }) {
  const { topDestinationsChange, topDestChangeLong } = data;

  return html`
    <div class="table-container">
      ${resize((width) => html`
        <table style="max-width: ${width}px;">
          <thead>
            <tr>
              <th class="municity">Destination</th>
              <th class="tourist-count">2019</th>
              <th class="tourist-count">2021</th>
              <th class="tourist-count">2023</th>
              <th class="sparkline">Trend</th>
              <th class="tourist-perc-change">Change</th>
            </tr>
          </thead>
          <tbody>
            ${topDestinationsChange
              .filter(d => d.traveler === selTraveler)
              // .slice(0, rangeTop)
              .map(({ provMuniCity, traveler, year2019, year2021, year2023, percChange }) => html`<tr>
                <td class="municity">${provMuniCity}</td>
                <td class="tourist-count">${formatNumber(year2019)}</td>
                <td class="tourist-count">${formatNumber(year2021)}</td>
                <td class="tourist-count">${formatNumber(year2023)}</td>
                <td class="sparkline">${sparklineDest({ topDestChangeLong }, traveler, provMuniCity)}</td>
                <td class="tourist-perc-change">${percChange > 0 ? `+${formatNumber(percChange)}` : percChange }%</td>
              </tr>`)}
          </tbody>
        </table>
      `)}
    </div>
  `
}

function sparklineDest(data, traveler, provMuniCity) {
  const { topDestChangeLong } = data
  const dataFiltered = topDestChangeLong
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
      Plot.areaY(dataFiltered, { x: d => new Date(d.year), y: "count", fillOpacity: 0.1 }),
      Plot.lineY(dataFiltered, { x: d => new Date(d.year), y: "count", tip: false })
    ],
  })
}

export { trendsTable, sparklineDest };