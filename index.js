const puppeteer = require("puppeteer");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const companiesData = [
	{ name: "Voltas", id: "VOLTAS" },
	{ name: "Blue Star", id: "BLUESTARCO" },
	{ name: "Crompton", id: "CROMPTON" },
	{ name: "Orient Electric", id: "ORIENTELEC" },
	{ name: "Havells", id: "HAVELLS" },
	{ name: "Symphony", id: "SYMPHONY" },
	{ name: "Whirlpool", id: "WHIRLPOOL" },
];

const baseUrl = "https://www.screener.in/company/";

const companies = companiesData.map((company) => ({
	name: company.name,
	url: `${baseUrl}${company.id}`,
}));

// Function to extract data with retries
async function extractWithRetries(fn, page, company, retries = 3) {
	let attempt = 0;
	let data = null;

	while (attempt < retries) {
		data = await fn(page, company);
		if (data && !Object.values(data).includes(null)) {
			return data;
		}
		attempt++;
		console.log(`Retrying for ${company.name}, attempt ${attempt}`);
	}

	console.log(
		`Failed to retrieve data for ${company.name} after ${retries} attempts.`
	);
	return data;
}

// Function to extract Basic Pokémon Power Stats
async function extractBasicPokemonStats(page, company) {
	await page.goto(company.url);

	const data = await page.evaluate(() => {
		const features = [
			{ name: "marketCap", index: 1 },
			{ name: "currentPrice", index: 2 },
			{ name: "stockPE", index: 4 },
			{ name: "ROCE", index: 7 },
			{ name: "ROE", index: 8 },
		];

		const featureValues = {};

		features.forEach((feature) => {
			const element = document.querySelector(
				`#top-ratios > li:nth-child(${feature.index}) .number`
			);
			featureValues[feature.name] = element ? element.innerText : null;
		});

		return featureValues;
	});
	console.log(data);
	return { company: company.name, ...data };
}

// Function to extract Pokémon Item Inventory
async function extractPokemonItemInventory(page, company) {
	await page.goto(company.url);

	const data = await page.evaluate(() => {
		const features = [
			{ name: "reserves", index: 2 },
			{ name: "borrowings", index: 3 },
			{ name: "totalLiabilities", index: 5 },
			{ name: "fixedAssets", index: 6 },
			{ name: "investments", index: 8 },
			{ name: "totalAssets", index: 10 },
		];

		const featureValues = {};

		features.forEach((feature) => {
			const element = document.querySelector(
				`#balance-sheet tbody tr:nth-child(${feature.index}) td:last-child`
			);
			featureValues[feature.name] = element ? element.innerText : null;
		});

		return featureValues;
	});
	console.log(data);
	return { company: company.name, ...data };
}

// Function to extract Pokémon Battle Performance Stats
async function extractBattlePerformanceStats(page, company) {
	await page.goto(company.url);

	const data = await page.evaluate(() => {
		const features = [
			{ name: "sales2022", index: 1, columnIndex: 4 },
			{ name: "netProfit2022", index: 10, columnIndex: 4 },
			{ name: "opm2022", index: 4, columnIndex: 4 },
			{ name: "eps2022", index: 11, columnIndex: 4 },
			{ name: "sales2023", index: 1, columnIndex: 3 },
			{ name: "netProfit2023", index: 10, columnIndex: 3 },
			{ name: "opm2023", index: 4, columnIndex: 3 },
			{ name: "eps2023", index: 11, columnIndex: 3 },
			{ name: "sales2024", index: 1, columnIndex: 2 },
			{ name: "netProfit2024", index: 10, columnIndex: 2 },
			{ name: "opm2024", index: 4, columnIndex: 2 },
			{ name: "eps2024", index: 11, columnIndex: 2 },
		];

		const featureValues = {};

		features.forEach((feature) => {
			const element = document.querySelector(
				`#profit-loss table tbody tr:nth-child(${feature.index}) td:nth-last-child(${feature.columnIndex})`
			);
			featureValues[feature.name] = element ? element.innerText : null;
		});

		return featureValues;
	});
	console.log(data);
	return { company: company.name, ...data };
}

// Helper function to write data to CSV
async function writeToCsv(fileName, data, header) {
	const csvWriter = createCsvWriter({
		path: fileName,
		header: header,
	});

	await csvWriter.writeRecords(data);
}

// Main Function
(async () => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	// Task 1: Extract Basic Pokémon Power Stats
	let basicStats = [];
	for (let company of companies) {
		const stats = await extractWithRetries(
			extractBasicPokemonStats,
			page,
			company
		);
		basicStats.push(stats);
	}

	await writeToCsv("Basic_Pokemon_Stats.csv", basicStats, [
		{ id: "company", title: "Company" },
		{ id: "marketCap", title: "Market Cap" },
		{ id: "stockPE", title: "Stock P/E" },
		{ id: "ROCE", title: "ROCE" },
		{ id: "currentPrice", title: "Current Price" },
		{ id: "ROE", title: "ROE" },
	]);

	// Task 2: Extract Pokémon Item Inventory
	let inventoryStats = [];
	for (let company of companies) {
		const inventory = await extractWithRetries(
			extractPokemonItemInventory,
			page,
			company
		);
		inventoryStats.push(inventory);
	}

	await writeToCsv("Pokemon_Item_Inventory.csv", inventoryStats, [
		{ id: "company", title: "Company" },
		{ id: "reserves", title: "Reserves" },
		{ id: "borrowings", title: "Borrowings" },
		{ id: "totalLiabilities", title: "Total Liabilities" },
		{ id: "fixedAssets", title: "Fixed Assets" },
		{ id: "investments", title: "Investments" },
		{ id: "totalAssets", title: "Total Assets" },
	]);

	// Task 3: Extract Pokémon Battle Performance Stats
	let battleStats = [];
	for (let company of companies) {
		const battlePerformance = await extractWithRetries(
			extractBattlePerformanceStats,
			page,
			company
		);
		battleStats.push(battlePerformance);
	}

	function remapBattleStats(battleStats) {
		const remappedData = [];

		battleStats.forEach((stat) => {
			const companyName = stat.company;

			for (let year = 2022; year <= 2024; year++) {
				remappedData.push({
					company: companyName,
					year: year,
					sales: stat[`sales${year}`],
					netProfit: stat[`netProfit${year}`],
					opm: stat[`opm${year}`],
					eps: stat[`eps${year}`],
				});
			}
		});

		return remappedData;
	}

	const remappedBattleStats = remapBattleStats(battleStats);

	await writeToCsv("Battle_Performance_Stats.csv", remappedBattleStats, [
		{ id: "company", title: "Company" },
		{ id: "year", title: "Year" },
		{ id: "sales", title: "Sales" },
		{ id: "netProfit", title: "Net Profit" },
		{ id: "opm", title: "OPM" },
		{ id: "eps", title: "EPS" },
	]);

	await browser.close();
})();
