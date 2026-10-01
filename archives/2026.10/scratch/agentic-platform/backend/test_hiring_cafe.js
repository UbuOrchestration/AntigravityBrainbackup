async function testSearch() {
  const url = 'https://hiring.cafe/api/search-jobs';
  const payload = {
    locations: [{
      formatted_address: "United States",
      types: ["country"],
      geometry: {
        location: {
          lat: "39.8283",
          lon: "-98.5795"
        }
      },
      id: "user_country",
      address_components: [{
        long_name: "United States",
        short_name: "US",
        types: ["country"]
      }],
      options: {
        flexible_regions: ["anywhere_in_continent", "anywhere_in_world"]
      }
    }],
    workplaceTypes: ["Remote"],
    jobTitleQuery: "CAD Technician",
    commitmentTypes: ["Full Time", "Part Time", "Contract"]
  };

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Origin': 'https://hiring.cafe',
    'Referer': 'https://hiring.cafe/'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ searchState: payload, limit: 10, offset: 0 })
    });
    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Data:", JSON.stringify(data, null, 2).substring(0, 1000));
  } catch (e) {
    console.error("Error:", e);
  }
}

testSearch();
