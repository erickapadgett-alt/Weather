const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;

async function fetchWeather(city) {
  return new Promise((resolve, reject) => {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function generateHTML(weather, city) {
  const current = weather.current_condition[0];
  const temp_c = current.temp_C;
  const temp_f = current.temp_F;
  const desc = current.weatherDesc[0].value;
  const humidity = current.humidity;
  const wind = current.windspeedKmph;
  const feelsLike = current.FeelsLikeC;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weather App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.95);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    h1 { color: #333; margin-bottom: 10px; font-size: 2em; }
    .city { color: #666; font-size: 1.2em; margin-bottom: 20px; }
    .temp { font-size: 4em; color: #667eea; font-weight: bold; }
    .desc { color: #888; font-size: 1.3em; margin: 10px 0 20px; }
    .details { display: flex; justify-content: space-around; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
    .detail { text-align: center; }
    .detail-value { font-size: 1.5em; color: #333; font-weight: bold; }
    .detail-label { color: #888; font-size: 0.9em; }
    form { margin-top: 30px; display: flex; gap: 10px; }
    input {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid #ddd;
      border-radius: 10px;
      font-size: 1em;
      outline: none;
      transition: border-color 0.3s;
    }
    input:focus { border-color: #667eea; }
    button {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1em;
      cursor: pointer;
      transition: background 0.3s;
    }
    button:hover { background: #5a6fd6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌤️ Weather</h1>
    <p class="city">${city}</p>
    <p class="temp">${temp_c}°C</p>
    <p class="desc">${desc}</p>
    <div class="details">
      <div class="detail">
        <div class="detail-value">${humidity}%</div>
        <div class="detail-label">Humidity</div>
      </div>
      <div class="detail">
        <div class="detail-value">${wind} km/h</div>
        <div class="detail-label">Wind</div>
      </div>
      <div class="detail">
        <div class="detail-value">${feelsLike}°C</div>
        <div class="detail-label">Feels Like</div>
      </div>
    </div>
    <form method="GET" action="/">
      <input type="text" name="city" placeholder="Enter city name..." value="${city}">
      <button type="submit">Search</button>
    </form>
  </div>
</body>
</html>`;
}

function generateError(message, city) {
  return `<!DOCTYPE html>
<html><head><title>Weather App</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#667eea;}
.box{background:white;padding:40px;border-radius:20px;text-align:center;}
h1{color:#e74c3c;}form{margin-top:20px;}input{padding:10px;border:2px solid #ddd;border-radius:8px;margin-right:10px;}
button{padding:10px 20px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;}</style></head>
<body><div class="box"><h1>⚠️ Error</h1><p>${message}</p>
<form method="GET" action="/"><input name="city" placeholder="Try another city" value="${city}"><button>Search</button></form></div></body></html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const city = url.searchParams.get('city') || 'Miami';
  
  res.setHeader('Content-Type', 'text/html');
  
  try {
    const weather = await fetchWeather(city);
    res.writeHead(200);
    res.end(generateHTML(weather, city));
  } catch (error) {
    res.writeHead(500);
    res.end(generateError('Could not fetch weather data. Please try again.', city));
  }
});

server.listen(PORT, () => {
  console.log(`Weather app running on port ${PORT}`);
});
