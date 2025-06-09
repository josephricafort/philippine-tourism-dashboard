import * as htl from "htl";
import * as Plot from "@observablehq/plot";

function sparklineDest(topDestTrends, traveler, provMuniCity) {
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

function trendsTable(topDestChange, topDestTrends, selectTraveler, { width, height } = {}) {
    return htl.html`<table>
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
            ${topDestChange.filter(d => d.traveler === selectTraveler)
            .map(({ provMuniCity, traveler, year2019, year2021, year2023, percChange }) => htl.html`<tr>
                <td>${provMuniCity}</td>
                <td>${year2019}</td>
                <td>${year2021}</td>
                <td>${year2023}</td>
                <td>${sparklineDest(topDestTrends, traveler, provMuniCity)}</td>
                <td>${percChange > 0 ? `+${percChange}` : percChange }%</td>
            </tr>`)}
        </tbody>
    </table>`
}

export { trendsTable, sparklineDest };