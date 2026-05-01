# 🎵 PoolStreamer - Production Discord Music Bot

A high-performance, stable, and production-ready Discord music bot built with **Discord.js v14**, **Kazagumo**, **Shoukaku**, and **Lavalink**.

## 🚀 Features

- **Stable Audio Engine**: Powered by Lavalink for lag-free, high-quality streaming.
- **Multi-Source Support**: YouTube, Spotify (links & search), SoundCloud, and more.
- **Production Ready**: 
  - **Watchdog System**: Automatically handles stuck players and ghost connections.
  - **24/7 Mode**: Restores voice connections automatically after bot restarts.
  - **MongoDB Integration**: Efficiently stores server configurations and user preferences.
  - **PM2 Support**: Optimized for 24/7 operation on VPS (Ubuntu/Debian).
  - **Health Monitoring**: Built-in Express server for uptime and health checks.
- **Permission System**: Advanced DJ role and whitelist/blacklist management.
- **Premium UI**: Sleek embeds with dynamic progress bars and button controls.
- **Optimized for VPS**: Low CPU and RAM footprint (< 450MB).

---

## 🛠️ Installation

### 1. Prerequisites
- **Node.js**: v20 or higher
- **MongoDB**: Local or Atlas URI
- **Lavalink**: A running Lavalink server (v3 or v4)
- **PM2**: `npm install -g pm2` (for production)

### 2. Setup
Clone the repository and install dependencies:
```bash
git clone https://github.com/yourusername/Poolstreamer_bot.git
cd Poolstreamer_bot
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
# Bot Config
DISCORD_TOKEN=your_bot_token
OWNER_ID=your_discord_id
CLIENT_ID=your_bot_client_id

# Database
MONGODB_URI=mongodb+srv://...

# Lavalink
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false

# Monitoring
PORT=3000
```

---

## 🏃 Running the Bot

### Development Mode
```bash
npm run dev
```

### Deploying Slash Commands
You must run this once (or whenever you add/edit commands):
```bash
npm run deploy
```

### Production Mode (VPS)
Using PM2 is highly recommended for 24/7 operation:
```bash
npm run pm2:start
```

---

## 📦 Deployment Guide (Ubuntu VPS)

1. **Install Node.js & PM2**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Configure Lavalink**:
   Ensure you have Java 17+ installed and run `lavalink.jar`. (Config file: `application.yml`)

3. **Start the Bot**:
   ```bash
   npm run deploy
   npm run pm2:start
   pm2 save
   pm2 startup
   ```

---

## 🐳 Docker Support
To run with Docker:
```bash
docker build -t poolstreamer .
docker run -d --env-file .env poolstreamer
```

---

## 🤝 Support & License
- **License**: MIT
- **Author**: Poolstreamer Team
