// Variables used by Scriptable.
// icon-color: cyan; icon-glyph: magic;

// ======================
// Config
// ======================
const CONFIG = {
  apiKey: "8b53a04ef577da06e5b30fb19044165c",
  googleScriptUrl: "https://script.google.com/macros/s/AKfycbxKwgpS2ouz9jAnC0ZrPAkuji5FZrSBIrYfN_9oxHWoQcpm38UQ8l4YZcpqOCZm3eNd/exec",
  cacheFile: "weather-tips-cache.json",
  icons: ["PNG1.png", "PNG2.png", "PNG3.png", "PNG4.png", "PNG5.png"],
  colors: {
    background: "#E8E8E8",
    textPrimary: "#2C2C2C",
    textSecondary: "#666666"
  },
  layout: {
    padding: { top: 30, left: 20, bottom: 20, right: 20 },
    spacing: { headerToTip: 10, sectionGap: 20 },
    fonts: { headerSize: 14, tipSize: 16 },
    iconMaxSize: { width: 110, height: 110 },
    sectionWidths: { textSection: 170, iconSection: 130 }
  }
};

// ======================
// Cache helper
// ======================
function getCacheFileManager() {
  return FileManager.local();
}

function getCachePath() {
  const fm = getCacheFileManager();
  return fm.joinPath(fm.documentsDirectory(), CONFIG.cacheFile);
}

function saveCache(data) {
  const fm = getCacheFileManager();
  fm.writeString(getCachePath(), JSON.stringify(data));
}

function loadCache() {
  const fm = getCacheFileManager();
  const path = getCachePath();
  if (fm.fileExists(path)) {
    try {
      return JSON.parse(fm.readString(path));
    } catch (e) {
      console.error("Cache parse error:", e);
    }
  }
  return null;
}

// ======================
// Fetch logic
// ======================
async function fetchWeatherTip() {
  const location = await Location.current();
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${CONFIG.apiKey}&units=metric&lang=en`;
  const weatherResponse = await new Request(weatherUrl).loadJSON();

  const mainWeather = weatherResponse.weather[0].main;
  const description = weatherResponse.weather[0].description;
  const temperature = weatherResponse.main.temp;

// Update value of REGIONS up to your preference: Asian, Western, Latin America, Middle Eastern, Mediterranean  
  const tipUrl = `${CONFIG.googleScriptUrl}?weather=${mainWeather}&description=${description}&temp=${temperature}&regions=Asian`;
  const tipResponse = await new Request(tipUrl).loadJSON();

  return {
    tip: tipResponse.tip,
    region: tipResponse.region, // ← Thêm dòng này
    updatedAt: new Date().toISOString(),
    weather: { main: mainWeather, description, temp: temperature }
  };
}

// ======================
// Widget builder
// ======================
async function buildWidget(data) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color(CONFIG.colors.background);
  widget.setPadding(
    CONFIG.layout.padding.top,
    CONFIG.layout.padding.left,
    CONFIG.layout.padding.bottom,
    CONFIG.layout.padding.right
  );

  const mainRow = widget.addStack();
  mainRow.layoutHorizontally();
  mainRow.topAlignContent();

  // Left section (text)
  const sectionA = mainRow.addStack();
  sectionA.layoutVertically();
  sectionA.topAlignContent();
  sectionA.size = new Size(CONFIG.layout.sectionWidths.textSection, 0);

  const headerText = sectionA.addText("Tip of the day");
  headerText.font = new Font("Georgia-Bold", CONFIG.layout.fonts.headerSize);
  headerText.textColor = new Color(CONFIG.colors.textPrimary);

  sectionA.addSpacer(CONFIG.layout.spacing.headerToTip);

  const tipText = sectionA.addText(data?.tip || "No data yet. Run automation.");
  tipText.font = new Font("Georgia", CONFIG.layout.fonts.tipSize);
  tipText.textColor = new Color(CONFIG.colors.textPrimary);
  tipText.leftAlignText();
  tipText.lineLimit = 0;
  tipText.minimumScaleFactor = 0.8;

  sectionA.addSpacer(6);
  const regionText = sectionA.addText("Region: " + (data?.region || "N/A"));
  regionText.font = Font.systemFont(10);
  regionText.textColor = new Color(CONFIG.colors.textSecondary);

  // Spacer
  mainRow.addSpacer(CONFIG.layout.spacing.sectionGap);

  // Right section (icon)
  const sectionB = mainRow.addStack();
  sectionB.layoutVertically();
  sectionB.topAlignContent();
  sectionB.size = new Size(CONFIG.layout.sectionWidths.iconSection, 0);

  const fm = FileManager.iCloud();
  const iconDir = fm.joinPath(fm.documentsDirectory(), "weather-tips-widget/icons");
  const iconName = CONFIG.icons[Math.floor(Math.random() * CONFIG.icons.length)];
  const iconPath = fm.joinPath(iconDir, iconName);
  if (fm.fileExists(iconPath)) {
    const icon = await Image.fromFile(iconPath);
    const iconElement = sectionB.addImage(icon);
    iconElement.imageSize = new Size(CONFIG.layout.iconMaxSize.width, CONFIG.layout.iconMaxSize.height);
    iconElement.applyFittingContentMode();
    iconElement.cornerRadius = 8;
  }

  return widget;
}

// ======================
// Main entry
// ======================
async function run() {
  if (config.runsInWidget) {
    const cache = loadCache();
    const now = new Date();

    // Chỉ refresh nếu: chưa có data hoặc chưa update hôm nay sau giờ bạn set up
    const refreshtime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0);
    const lastUpdate = cache ? new Date(cache.updatedAt) : new Date(0);
    
    console.log("Now:", now.toLocaleString());
    console.log("Refresh time:", refreshtime.toLocaleString());
    console.log("Should refresh:", !cache || (now >= refreshtime && lastUpdate < refreshtime));

    if (!cache || (now >= refreshtime && lastUpdate < refreshtime)) {
      const data = await fetchWeatherTip();
      saveCache(data);
      const widget = await buildWidget(data);
      Script.setWidget(widget);
    } else {
      const widget = await buildWidget(cache);
      Script.setWidget(widget);
    }
  }
  else {
    // Manual run trong app - luôn fetch để test
    const data = await fetchWeatherTip();
    saveCache(data);
    QuickLook.present("Manual refresh: " + new Date().toLocaleTimeString());
  }
  
  Script.complete();
}

await run();
