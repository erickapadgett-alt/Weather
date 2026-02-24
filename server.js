const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const LOGIN_USER = 'Ericka';
const LOGIN_PASS = 'Ericka111';

// Simple session storage (in production, use proper sessions)
const sessions = new Set();

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

function isLoggedIn(req) {
  const sessionId = getCookie(req, 'session');
  return sessionId && sessions.has(sessionId);
}

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

function generateLoginPage(error = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weather App - Login</title>
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
    .dog-img {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 20px;
      border: 4px solid #667eea;
    }
    h1 { color: #333; margin-bottom: 10px; font-size: 1.8em; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .error { color: #e74c3c; margin-bottom: 15px; }
    form { display: flex; flex-direction: column; gap: 15px; }
    input {
      padding: 14px 18px;
      border: 2px solid #ddd;
      border-radius: 10px;
      font-size: 1em;
      outline: none;
      transition: border-color 0.3s;
    }
    input:focus { border-color: #667eea; }
    button {
      padding: 14px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1.1em;
      cursor: pointer;
      transition: background 0.3s;
    }
    button:hover { background: #5a6fd6; }
  </style>
</head>
<body>
  <div class="container">
    <img src="/golden-retriever.jpg" alt="Golden Retriever" class="dog-img">
    <h1>🌤️ Weather App</h1>
    <p class="subtitle">Please login to continue</p>
    ${error ? `<p class="error">${error}</p>` : ''}
    <form method="POST" action="/login">
      <input type="text" name="username" placeholder="Username" required>
      <input type="password" name="password" placeholder="Password" required>
      <button type="submit">Login</button>
    </form>
  </div>
</body>
</html>`;
}

function generateHTML(weather, city) {
  const current = weather.current_condition[0];
  const temp_f = current.temp_F;
  const desc = current.weatherDesc[0].value;
  const humidity = current.humidity;
  const wind_mph = Math.round(current.windspeedKmph * 0.621371);
  const feelsLike_f = current.FeelsLikeF;
  
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
    .dog-img {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 15px;
      border: 4px solid #667eea;
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
    .logout { margin-top: 20px; }
    .logout a { color: #667eea; text-decoration: none; }
    .logout a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <img src="/golden-retriever.jpg" alt="Golden Retriever" class="dog-img">
    <h1>🌤️ Weather</h1>
    <p class="city">${city}</p>
    <p class="temp">${temp_f}°F</p>
    <p class="desc">${desc}</p>
    <div class="details">
      <div class="detail">
        <div class="detail-value">${humidity}%</div>
        <div class="detail-label">Humidity</div>
      </div>
      <div class="detail">
        <div class="detail-value">${wind_mph} mph</div>
        <div class="detail-label">Wind</div>
      </div>
      <div class="detail">
        <div class="detail-value">${feelsLike_f}°F</div>
        <div class="detail-label">Feels Like</div>
      </div>
    </div>
    <form method="GET" action="/weather">
      <input type="text" name="city" placeholder="Enter city name..." value="${city}">
      <button type="submit">Search</button>
    </form>
    <p class="logout"><a href="/logout">Logout</a></p>
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
<form method="GET" action="/weather"><input name="city" placeholder="Try another city" value="${city}"><button>Search</button></form></div></body></html>`;
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      resolve(Object.fromEntries(params));
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Serve golden retriever image
  if (pathname === '/golden-retriever.jpg') {
    const imgPath = path.join(__dirname, 'golden-retriever.jpg');
    if (fs.existsSync(imgPath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.writeHead(200);
      fs.createReadStream(imgPath).pipe(res);
      return;
    }
  }

  // Handle login POST
  if (pathname === '/login' && req.method === 'POST') {
    const body = await parseBody(req);
    if (body.username === LOGIN_USER && body.password === LOGIN_PASS) {
      const sessionId = generateSessionId();
      sessions.add(sessionId);
      res.setHeader('Set-Cookie', `session=${sessionId}; Path=/; HttpOnly`);
      res.writeHead(302, { Location: '/weather' });
      res.end();
      return;
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(generateLoginPage('Invalid username or password'));
      return;
    }
  }

  // Handle logout
  if (pathname === '/logout') {
    const sessionId = getCookie(req, 'session');
    if (sessionId) sessions.delete(sessionId);
    res.setHeader('Set-Cookie', 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  // Check login for protected routes
  if (!isLoggedIn(req) && pathname !== '/login') {
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(generateLoginPage());
    return;
  }

  // Weather page
  if (pathname === '/weather' || pathname === '/') {
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
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Weather app running on port ${PORT}`);
});
