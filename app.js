
// ======================================
// AI STOCK PREDICTOR
// ======================================

// Store all stock records
let stockData = [];

// Store chart instance
let stockChart = null;

// Load CSV dataset
async function loadDataset() {

  const message = document.getElementById("message");

  try {

    const response = await fetch("data.csv");

    if (!response.ok) {
      throw new Error("CSV file not found");
    }

    const csvText = await response.text();

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    stockData = result.data.filter(row =>
      row.Ticker &&
      row.Company &&
      Number.isFinite(Number(row.Close)) &&
      row.Date
    );

    if (stockData.length === 0) {
      throw new Error("No valid stock records found");
    }

    populateCompanies();

    message.textContent =
      "Dataset loaded successfully: " +
      stockData.length + " records";

    document.getElementById("stockSelect").selectedIndex = 0;

    analyzeStock();

  } catch (error) {

    message.textContent = "Error: " + error.message;

    console.error(error);
  }
}


// ======================================
// COMPANY DROPDOWN
// ======================================

function populateCompanies() {

  const select = document.getElementById("stockSelect");

  const companies = [
    ...new Map(
      stockData.map(row => [
        row.Ticker,
        {
          ticker: row.Ticker,
          company: row.Company
        }
      ])
    ).values()
  ];

  select.innerHTML = "";

  companies.forEach(company => {

    const option = document.createElement("option");

    option.value = company.ticker;

    option.textContent =
      company.company + " (" + company.ticker + ")";

    select.appendChild(option);

  });

}


// ======================================
// LINEAR REGRESSION
// ======================================

function predictNextPrice(records) {

  const prices = records.map(row => Number(row.Close));

  const n = prices.length;

  if (n < 2) {
    return null;
  }

  // X = Month number
  const x = prices.map((_, index) => index);

  const meanX =
    x.reduce((sum, value) => sum + value, 0) / n;

  const meanY =
    prices.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {

    numerator +=
      (x[i] - meanX) * (prices[i] - meanY);

    denominator +=
      (x[i] - meanX) ** 2;

  }

  const slope = denominator === 0
    ? 0
    : numerator / denominator;

  const intercept = meanY - slope * meanX;

  // Predict next month
  const prediction =
    intercept + slope * n;

  return {
    price: Math.max(0, prediction),
    slope: slope
  };

}


// ======================================
// ANALYZE STOCK
// ======================================

function analyzeStock() {

  const ticker =
    document.getElementById("stockSelect").value;

  const records = stockData
    .filter(row => row.Ticker === ticker)
    .sort((a, b) =>
      new Date(a.Date) - new Date(b.Date)
    );

  if (records.length === 0) return;

  const latest = records[records.length - 1];

  const prediction = predictNextPrice(records);

  // Company information
  document.getElementById("companyName").textContent =
    latest.Company;

  document.getElementById("companySector").textContent =
    latest.Sector;

  // Main statistics
  document.getElementById("currentPrice").textContent =
    formatPrice(latest.Close);

  document.getElementById("eps").textContent =
    formatNumber(latest.EPS);

  document.getElementById("pe").textContent =
    formatNumber(latest.PE_Ratio);

  // Fundamentals
  document.getElementById("marketCap").textContent =
    formatNumber(latest.Market_Cap_Mn) + " Mn";

  document.getElementById("revenue").textContent =
    formatNumber(latest.Revenue_Growth_Pct) + "%";

  document.getElementById("debt").textContent =
    formatNumber(latest.Debt_to_Equity);

  document.getElementById("volume").textContent =
    formatNumber(latest.Volume);

  // Prediction
  if (prediction) {

    const predicted = prediction.price;

    document.getElementById("predictedPrice").textContent =
      formatPrice(predicted);

    document.getElementById("forecast").textContent =
      formatPrice(predicted);

    const trend =
      prediction.slope >= 0 ? "Upward" : "Downward";

    document.getElementById("trendText").textContent =
      "Historical trend: " + trend +
      " | Estimated change: " +
      formatPrice(predicted - Number(latest.Close));

  }

  // Render chart
  renderChart(records);

  // Render table
  renderTable(records);

}


// ======================================
// STOCK CHART
// ======================================

function renderChart(records) {

  const ctx =
    document.getElementById("stockChart");

  if (stockChart) {
    stockChart.destroy();
  }

  stockChart = new Chart(ctx, {

    type: "line",

    data: {

      labels: records.map(row => row.Date),

      datasets: [{

        label: "Closing Price",

        data: records.map(row => Number(row.Close)),

        borderColor: "#20d6a1",

        backgroundColor: "rgba(32,214,161,0.10)",

        borderWidth: 2,

        pointRadius: 3,

        fill: true,

        tension: 0.35

      }]

    },

    options: {

      responsive: true,

      maintainAspectRatio: false,

      plugins: {

        legend: {
          labels: {
            color: "#ffffff"
          }
        }

      },

      scales: {

        x: {
          ticks: {
            color: "#94a3b8"
          },
          grid: {
            color: "#26364e"
          }
        },

        y: {
          ticks: {
            color: "#94a3b8"
          },
          grid: {
            color: "#26364e"
          }
        }

      }

    }

  });

}


// ======================================
// HISTORICAL TABLE
// ======================================

function renderTable(records) {

  const tbody =
    document.getElementById("stockTable");

  tbody.innerHTML = "";

  const recentRecords = [...records]
    .reverse()
    .slice(0, 12);

  recentRecords.forEach(row => {

    const tr = document.createElement("tr");

    const values = [
      row.Date,
      formatNumber(row.Open),
      formatNumber(row.High),
      formatNumber(row.Low),
      formatNumber(row.Close),
      formatNumber(row.Volume)
    ];

    values.forEach(value => {

      const td = document.createElement("td");

      td.textContent = value ?? "--";

      tr.appendChild(td);

    });

    tbody.appendChild(tr);

  });

}


// ======================================
// NUMBER FORMATTING
// ======================================

function formatPrice(value) {

  return Number(value).toFixed(2);

}

function formatNumber(value) {

  if (value === null || value === undefined ||
      !Number.isFinite(Number(value))) {
    return "--";
  }

  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });

}


// ======================================
// BUTTON EVENTS
// ======================================

document
  .getElementById("analyzeBtn")
  .addEventListener("click", analyzeStock);

document
  .getElementById("stockSelect")
  .addEventListener("change", analyzeStock);


// ======================================
// START APPLICATION
// ======================================

loadDataset();
  
