import * as Plot from "npm:@observablehq/plot";
import { formatDestination, formatNumber, getTripAdvisorUrl } from "./utils.js"
import { NCR } from "./constants.js";
import  { html } from "npm:htl";
import * as d3 from "npm:d3";

function totalBars(data, { width, height }){
    const { phTourismFiltered } = data;

    // Filter out provincial data and only keep municipal data
    // Keep only those that are in NCR
    const dataFiltered = phTourismFiltered.filter(d => {
      if(d.province === d.muniCity) {
        if (d.region === NCR) { return true }
        else return false
      }
      else return true
    });

  return Plot.plot({
    y: { axis: null },
    marks: [
      Plot.barX(dataFiltered, Plot.groupY(
        {x: "sum"}, 
        {x: "count", 
          y: "", 
          fill: "traveler", 
          sort: {y: "x", reverse: true }, 
          tickFormat: ".2s", 
          tip: { format: { y: false } } 
        })),
        Plot.axisX({
            anchor: "top",
            tickFormat: ".0s",
        }),
      Plot.ruleX([0])
    ],
    marginLeft: 0,
    width,
    color: { legend: true }
  })
}

function topDestBars(data, { width, height }){ 
    const { topDestinations } = data;

  return Plot.plot({
    marginLeft: 150,
    width,
    marks: [
        Plot.barX(
          topDestinations,
          Plot.groupY(
            { x: "sum" },
            { x: "count",
              y: ({ region, province, muniCity }) => formatDestination({ region, province, muniCity }),
              fill: "traveler",
              sort: { y: "x", reverse: true },
              tickFormat: ".0s",
              tip: {
                format: { y: false }
              }
            }
          )
        ),
        Plot.axisX({
          anchor: "top",
          tickFormat: ".1s"
        }),
        Plot.axisX({
          anchor: "bottom",
          tickFormat: ".1s"
        }),
        Plot.axisY({
            textOverflow: "ellipsis",
            lineWidth: 12,
            textAnchor: "end",
        }),
      Plot.frame({ fill: "#ffffff", fillOpacity: 0.05, strokeOpacity: .25 })
    ],
    fx: { padding: 0.2 },
    x: { grid: true }
  })
}

function miniStackedBars(data, { province, muniCity, total, maxVal }) {
  const { topDestinations } = data
  const dataFiltered = topDestinations.filter(d => d.province === province && d.muniCity === muniCity)
  
  return Plot.plot({
    style: {
      display: "inline-block",
      marginBottom: -1,
      zIndex: 2,
      position: "relative"
    },
    x: { axis: null },
    y: { axis: null },
    width: (100 * total) / maxVal,
    height: 15,
    margin: 0,
    marks: [
      Plot.barX(
        dataFiltered,
          Plot.groupY(
            { x: "sum" },
            { x: "count",
              y: (d) => formatDestination({ region: d.region, province: d.province, muniCity: d.muniCity }),
              fill: "traveler",
              sort: { y: "x", reverse: true },
              tickFormat: ".0s",
              tip: {
                format: { y: false }
              }
            }
          )
        )
    ]
  })
}

function barsTable(data, { resize, region, years, onToggleTablesNum }) {
  const { topDestinationsWide, topDestinations } = data;
  const maxVal = d3.max(topDestinationsWide, d => d.total) || 1; // Avoid division by zero

  return html`
    <div class="table-container">
      ${resize((width) => html`
        <table style="max-width: ${width}px;">
          <thead>
            <tr>
              <th class="rank"></th>
              <th class="destination">Destination</th>
              <th class="total">Total</th>
              <th class="bars"></th>
            </tr>
          </thead>
          <tbody>
            ${topDestinationsWide
              .map(({ muniCity, province, domestic, foreign, total }, i) => html`<tr>
                <td class="rank">${i + 1}</td>
                <td class="destination">
                  <a href="${getTripAdvisorUrl({ province, muniCity })}" target="_blank" rel="noopener noreferrer">
                    ${formatDestination({ region, province, muniCity })}
                  </a>
                </td>
                <td class="travelers">${formatNumber(total)}</td>
                <td class="mini-bars">
                  ${miniStackedBars({ topDestinations }, { years, province, muniCity, total, maxVal })}
                </td>
              </tr>`)
            }
          </tbody>
        </table>
      `)
    }
    </div>
  `
}

export { totalBars, topDestBars, barsTable }