import * as Plot from "npm:@observablehq/plot";
import  { html } from "npm:htl";
import { formatNumber } from "./utils.js";

function trendsTable(data, {resize, selTraveler, rangeTop }) {
  const { topDestinationsChange, topDestChangeLong } = data;
  function percChangeStyle(perc) {
    if (perc > 0) {
      return "color: #3ca952; font-weight: bold;";
    } else if (perc === 0) {
      return "color: grey;";
    } else {
      return "color: #e45756; font-weight: bold;";
    }
  }

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
                <td class="tourist-count">${year2019 > 0 ? formatNumber(year2019) : "-"}</td>
                <td class="tourist-count">${!isNaN(year2021) ? formatNumber(year2021) : "-"}</td>
                <td class="tourist-count">${formatNumber(year2023)}</td>
                <td class="sparkline">${sparklineDest({ topDestChangeLong }, traveler, provMuniCity)}</td>
                <td class="tourist-perc-change" style="${percChangeStyle(percChange)}">
                    ${percChange > 0 ? `+${formatNumber(percChange)}` : percChange }%
                </td>
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
      Plot.areaY(dataFiltered, { 
        x: d => new Date(d.year), 
        y: "count", 
        fill: d => 
          d.percChange > 0 && "#3ca952" || 
          d.percChange === 0 && "grey" || "#e45756",
        fillOpacity: 0.25,
        filter: d => d.count > 0 // Filter out 0s and NaNs
      }),
      Plot.lineY(dataFiltered, { 
        x: d => new Date(d.year),
        y: "count", 
        stroke: d => 
          d.percChange > 0 && "#3ca952" || 
          d.percChange === 0 && "grey" || "#e45756",
        tip: false,
        filter: d => d.count > 0 // Filter out 0s and NaNs
      })
    ],
  })
}

export { trendsTable, sparklineDest };