import * as d3 from "npm:d3";

// Create a formatter function
const formatNumber = d3.format(".2s");

// // Example usage
// console.log(formatTouristNumber(123));        // "120"
// console.log(formatTouristNumber(1234));       // "1.2k"
// console.log(formatTouristNumber(1234567));    // "1.2M"

export { formatNumber }
