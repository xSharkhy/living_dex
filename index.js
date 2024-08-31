import puppeteer from 'puppeteer'

import { exec } from 'node:child_process'
import path from 'node:path'
import * as fsp from 'node:fs/promises'

// Selectors for web scraping
const SELECTORS = {
  CSS: {
    ARTICLE: 'article#Pokémon_Platino-0',
    ARTICLE_LINK_SELECTOR: 'article#Pokémon_Platino-0 tbody tr td:nth-child(4) a',
    POKEMON_NAME: 'h1 > span > span',
    POKEMON_SINNOH_NUMBER: '#numerosinnoh',
    POKEMON_PLATINUM_LOCALISATION: 'td[style="background-color:#B5B5B5"] > ul > li',
    OPTIONAL_LOCALISATION_DL: 'td[style="background-color:#B5B5B5"] > dl > dd'
  }
}

const URL = 'https://www.wikidex.net/wiki/Lista_de_Pok%C3%A9mon_seg%C3%BAn_la_Pok%C3%A9dex_de_Sinnoh#Pok%C3%A9mon_Platino-0'

// Disable unnecessary resource loading
async function disableResourceLoading (page) {
  await page.setRequestInterception(true)
  page.on('request', req => {
    const type = req.resourceType()
    const shouldBlock = ['image', 'stylesheet', 'font'].includes(type)
    shouldBlock ? req.abort() : req.continue()
  })
}

// Extract Pokémon data from a single page
async function extractPokemonData (page, link) {
  await page.goto(link, { waitUntil: 'networkidle2' })

  const name = await page.$eval(SELECTORS.CSS.POKEMON_NAME, el => el.textContent.trim())

  const number = await page.$eval(SELECTORS.CSS.POKEMON_SINNOH_NUMBER, el => {
    // Remove any superscript elements
    const superindex = el.querySelectorAll('sup')
    superindex.forEach(sup => sup.remove())
    return el.textContent.trim()
  })

  let obtain = await page.$$eval(SELECTORS.CSS.POKEMON_PLATINUM_LOCALISATION,
    list => list.map(item => item.textContent.trim()).join('\n'))

  const existsOptional = await page.$(SELECTORS.CSS.OPTIONAL_LOCALISATION_DL)
  if (existsOptional) {
    const optional = await page.$$eval(SELECTORS.CSS.OPTIONAL_LOCALISATION_DL,
      list => list.map(item => item.textContent.trim()).join('\n'))
    obtain += '\n' + optional
  }

  console.log(`Data obtained for ${name}!`)
  return { name, number, link, obtain }
}

// Scrape data for all Pokémon
async function scrapeAllPokemonData (browser, page) {
  const links = await page.$$eval(SELECTORS.CSS.ARTICLE_LINK_SELECTOR, links => links.map(link => link.href))
  const data = []

  for (const link of links) {
    const newPage = await browser.newPage()
    await disableResourceLoading(newPage)
    const pokemonData = await extractPokemonData(newPage, link)
    data.push(pokemonData)
    await newPage.close()
  }

  return data
}

// Transform raw Pokémon data
function transformPokemonData (pokemonInfo) {
  const obtainMethods = pokemonInfo.obtain.split('\n')
  pokemonInfo.capturable = isCapturable(obtainMethods)
  pokemonInfo.obtain = obtainMethods.map(parseObtainMethod)
}

// Check if a Pokémon is capturable
function isCapturable (methods) {
  if (methods.length > 3) return true
  const lowerCaseMethods = methods.map(method => method.toLowerCase())
  const check = lowerCaseMethods.map(method => {
    if (method.includes('evolucionar') || method.includes('intercambiar') || method.includes('parque compi')) {
      return false
    }
    return true
  })

  return !check.every(value => !value)
}

// Parse a single obtain method
function parseObtainMethod (method) {
  const [obtainMethod, location] = method.split(': ')
  return { method: obtainMethod, location }
}

// Process evolution chain and update 'needed' counts
function processEvolutionChain (pokemonList, currentPokemon) {
  if (currentPokemon.capturable) {
    incrementNeededCount(currentPokemon)
    return
  }

  currentPokemon.obtain.forEach(item => {
    if (item.method.includes('Evolucionar')) {
      const evolutionName = item.location.split(' ')[1]
      const evolvedPokemon = findPokemonByName(pokemonList, evolutionName)
      if (evolvedPokemon) {
        processEvolutionChain(pokemonList, evolvedPokemon)
      }
    }
  })
}

// Helper function to find a Pokémon by name
const findPokemonByName = (pokemonList, name) => pokemonList.find(p => p.name === name)

// Helper function to increment the 'needed' count for a Pokémon
const incrementNeededCount = (pokemon) => {
  if (!pokemon.needed) pokemon.needed = 0
  pokemon.needed++
}

// Update 'needed' counts for all Pokémon
function updatePokemonNeededCounts (pokemonList) {
  pokemonList.forEach(pokemon => processEvolutionChain(pokemonList, pokemon))
}

function generatePokemonTable (pokemonData) {
  // Create the HTML structure
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pokémon Data Table</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid black;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        button {
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <button id="filterButton">Show Only Capturable Pokémon</button>
    <table id="pokemonTable">
        <thead>
            <tr>
                <th>Number</th>
                <th>Name</th>
                <th>Capturable</th>
                <th>Needed</th>
                <th>Obtain Methods</th>
            </tr>
        </thead>
        <tbody id="pokemonTableBody">
        </tbody>
    </table>

    <script>
    const pokemonData = ${JSON.stringify(pokemonData)};
    let showOnlyCapturable = false;

    function populateTable(data) {
        const tableBody = document.getElementById('pokemonTableBody');
        tableBody.innerHTML = '';
        
        data.forEach(pokemon => {
            if (!showOnlyCapturable || pokemon.capturable) {
                const row = tableBody.insertRow();
                row.insertCell(0).textContent = pokemon.number;
                row.insertCell(1).textContent = pokemon.name;
                row.insertCell(2).textContent = pokemon.capturable ? 'Yes' : 'No';
                row.insertCell(3).textContent = pokemon.needed ? \`Needed: \${pokemon.needed}\` : '';
                row.insertCell(4).innerHTML = pokemon.obtain.map(m => \`\${m.method}: \${m.location}\`).join('<br>');
            }
        });
    }

    document.getElementById('filterButton').addEventListener('click', () => {
        showOnlyCapturable = !showOnlyCapturable;
        document.getElementById('filterButton').textContent = 
            showOnlyCapturable ? 'Show All Pokémon' : 'Show Only Capturable Pokémon';
        populateTable(pokemonData);
    });

    // Initial population of the table
    populateTable(pokemonData);
    </script>
</body>
</html>
  `

  return html
}

function openInBrowser (filename) {
  const filePath = path.resolve(filename)
  const command = process.platform === 'win32'
    ? 'start'
    : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open'

  exec(`${command} ${filePath}`, (error) => {
    if (error) {
      console.error('Error opening the file:', error)
    } else {
      console.log('File opened in the default browser')
    }
  })
}

// Main function to run the scraper
async function runScraper () {
  let browser

  try {
    browser = await puppeteer.launch()
    const [page] = await browser.pages()

    await disableResourceLoading(page)
    await page.goto(URL, { waitUntil: 'networkidle2' })
    await page.waitForSelector(SELECTORS.CSS.ARTICLE)

    const data = await scrapeAllPokemonData(browser, page)

    data.forEach(transformPokemonData)
    updatePokemonNeededCounts(data)

    await fsp.writeFile('./data/data.json', JSON.stringify(data, null, 2))
    console.log('Data saved successfully!')
  } catch (error) {
    console.error('An error occurred:', error)
  } finally {
    if (browser) await browser.close()
  }
}

// Run the scraper
async function main () {
  const dataFile = './data/data.json'
  const outputFile = './output/index.html'

  // Check if data file exists
  try {
    await fsp.access(dataFile)
  } catch {
    console.log('Data file not found. Running scraper...')
    await runScraper()
    console.log('Scraper finished successfully!')
  }

  // Read data from file
  const jsonData = await fsp.readFile(dataFile, 'utf-8')
  const pokemonData = JSON.parse(jsonData)

  // Generate HTML content
  const htmlContent = generatePokemonTable(pokemonData)

  // Write HTML content to file
  await fsp.writeFile(outputFile, htmlContent)
  console.log('HTML file generated successfully!')

  // Open HTML file in browser
  openInBrowser(outputFile)
}

main().catch(console.error)
