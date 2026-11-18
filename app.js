
let stockData = [];
let stockChart = null;

async function loadDataset() {
  const message = document.getElementById("message");
  const select = document.getElementById("stockSelect");

  message.textContent = "Loading stock dataset...";

  try {
  const response = await fetch("./data.csv?v=2");

    if (!response.ok) {
      throw new Error("data.csv not found: " + response.status);
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
      throw new Error("CSV data is empty or incorrect");
    }

    const companies = [
      ...new Map(
        stockData.map(row => [
          row.Ticker,
          { ticker: row.Ticker, company: row.Company }
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

    message.textContent =
      "Dataset loaded successfully: " + stockData.length + " records";

    analyzeStock();

  } catch (error) {
    message.textContent = "Error: " + error.message;
    console.error(error);
  }
}

function formatNumber(value) {
  if (value === null || value === undefined ||
      !Number.isFinite(Number(value))) return "--";

  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function predictNextPrice(records) {
  const prices = records.map(row => Number(row.Close));
  const n = prices.length;

  if (n < 2) return null;

  const meanX = (n - 1) / 2;
  const meanY = prices.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - meanX) * (prices[i] - meanY);
    denominator += (i - meanX) ** 2;
  }

  const slope = denominator ? numerator / denominator : 0;
  const prediction = meanY + slope * (n - 1 - meanX + 1);

  return { price: Math.max(0, prediction), slope };
}

function analyzeStock() {
  const ticker = document.getElementById("stockSelect").value;

  const records = stockData
    .filter(row => row.Ticker === ticker)
    .sort((a, b) => new Date(a.Date) - new Date(b.Date));

  if (!records.length) return;

  const latest = records[records.length - 1];
  const prediction = predictNextPrice(records);

  document.getElementById("companyName").textContent = latest.Company;
  document.getElementById("companySector").textContent = latest.Sector;
  document.getElementById("currentPrice").textContent = formatNumber(latest.Close);
  document.getElementById("eps").textContent = formatNumber(latest.EPS);
  document.getElementById("pe").textContent = formatNumber(latest.PE_Ratio);
  document.getElementById("marketCap").textContent = formatNumber(latest.Market_Cap_Mn) + " Mn";
  document.getElementById("revenue").textContent = formatNumber(latest.Revenue_Growth_Pct) + "%";
  document.getElementById("debt").textContent = formatNumber(latest.Debt_to_Equity);
  document.getElementById("volume").textContent = formatNumber(latest.Volume);

  if (prediction) {
    document.getElementById("predictedPrice").textContent = formatNumber(prediction.price);
    document.getElementById("forecast").textContent = formatNumber(prediction.price);

    document.getElementById("trendText").textContent =
      "Historical trend: " +
      (prediction.slope >= 0 ? "Upward" : "Downward");
  } else {
    document.getElementById("predictedPrice").textContent = "--";
    document.getElementById("forecast").textContent = "--";
    document.getElementById("trendText").textContent =
      "At least 2 records are needed for prediction.";
  }

  renderChart(records);
  renderTable(records);
}

function renderChart(records) {
  const canvas = document.getElementById("stockChart");

  if (!canvas || typeof Chart === "undefined") return;

  if (stockChart) stockChart.destroy();

  stockChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: records.map(row => row.Date),
      datasets: [{
        label: "Closing Price",
        data: records.map(row => Number(row.Close)),
        borderColor: "#20d6a1",
        backgroundColor: "rgba(32,214,161,0.10)",
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderTable(records) {
  const tbody = document.getElementById("stockTable");
  tbody.innerHTML = "";

  [...records].reverse().forEach(row => {
    const tr = document.createElement("tr");

    [
      row.Date, row.Open, row.High,
      row.Low, row.Close, row.Volume
    ].forEach(value => {
      const td = document.createElement("td");
      td.textContent = value ?? "--";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

document.getElementById("analyzeBtn")
  .addEventListener("click", analyzeStock);

document.getElementById("stockSelect")
  .addEventListener("change", analyzeStock);

loadDataset();
        

/* NIFTY 50 Additional Company Search */
(async function addNiftyCompanySearch() {
  const tableBody = document.getElementById("niftyCompanyTable");
  const searchInput = document.getElementById("niftySearch");
  const countElement = document.getElementById("niftyCompanyCount");

  if (!tableBody || !searchInput) return;

  try {
    const response = await fetch("./data.csv?v=3");

    if (!response.ok) {
      throw new Error("CSV file could not be loaded");
    }

    const csvText = await response.text();

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    const rows = result.data.filter(row =>
      row.Ticker && row.Company
    );

    // Keep the latest available row for each ticker
    const latestCompanies = new Map();

    rows.forEach(row => {
      const ticker = String(row.Ticker).trim();
      const previous = latestCompanies.get(ticker);

      if (
        !previous ||
        String(row.Date) > String(previous.Date)
      ) {
        latestCompanies.set(ticker, row);
      }
    });

    const companies = Array.from(latestCompanies.values());

    if (countElement) {
      countElement.textContent = companies.length;
    }

    function showCompanies(searchText = "") {
      const query = searchText.toLowerCase().trim();

      const filtered = companies.filter(row =>
        String(row.Company).toLowerCase().includes(query) ||
        String(row.Ticker).toLowerCase().includes(query)
      );

      tableBody.replaceChildren();

      if (filtered.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 3;
        td.textContent = "No company found";
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
      }

      filtered.forEach(row => {
        const tr = document.createElement("tr");

        const companyCell = document.createElement("td");
        companyCell.textContent = row.Company;

        const tickerCell = document.createElement("td");
        tickerCell.textContent = row.Ticker;

        const closeCell = document.createElement("td");
        const close = Number(row.Close);

        closeCell.textContent = Number.isFinite(close)
          ? close.toFixed(2)
          : "Data unavailable";

        tr.append(companyCell, tickerCell, closeCell);
        tableBody.appendChild(tr);
      });
    }

    searchInput.addEventListener("input", () => {
      showCompanies(searchInput.value);
    });

    showCompanies();

  } catch (error) {
    console.error("NIFTY company search error:", error);
    tableBody.innerHTML =
      '<tr><td colspan="3">Data load nahi ho paya.</td></tr>';
  }
})();
