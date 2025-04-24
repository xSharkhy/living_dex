# living_dex

A Node.js ESM-based scraper and HTML generator that collects Sinnoh Pokédex data from Wikidex, transforms it to annotate capturability and “needed” evolution counts, and produces an interactive table you can view in your browser.

This tool leverages **Puppeteer** (v23.2.1) for headless browsing and data extraction

## 📦 Features

- **Headless scraping** of Pokémon list and individual pages from Wikidex using Puppeteer.
- **Data transformation** to determine which Pokémon are capturable and compute “needed” counts through evolution chains.
- **Interactive HTML table** generation with a toggle button to filter only capturable Pokémon.
- **Automatic browser launch** of the generated report via `child_process.exec`.

## 🚀 Installation

Ensure you have **Node.js** (v14+ recommended) and **npm** or **pnpm** installed.

```bash
git clone https://github.com/xSharkhy/living_dex.git
cd living_dex
npm install
# or, if using pnpm:
pnpm install
```

## ⚙️ Usage

Run the scraper and report generator with:

```bash
npm start
```

- On first run, if `./data/data.json` is missing, the scraper will fetch and save data.
- Then it reads the JSON, builds `./output/index.html`, and opens it in your default browser.

## 📂 Project Structure

```
living_dex/
├── data/               # Holds scraped data JSON (`.gitkeep` placeholder initially)
├── output/             # Contains generated HTML report (`.gitkeep` placeholder initially)
├── index.js            # Main scraper & generator logic (ESM module)
├── package.json        # Project metadata, dependencies, and scripts
├── pnpm-lock.yaml      # Lockfile for pnpm users
└── .gitignore          # Exclude data/output and node_modules
```

## 📜 Scripts

- `npm start` — Executes `index.js`, orchestrating scrape → transform → HTML generation → browser open.
- `npm test`  — Placeholder; no tests specified.

## 🤝 Contributing

Contributions and suggestions are welcome! Please open an issue or submit a pull request to improve scraping logic, data transformations, or UI features.

## ⚖️ License

This project is licensed under the **ISC License**.
