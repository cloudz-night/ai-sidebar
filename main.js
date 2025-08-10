const { app, BrowserWindow, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');

let win;
let tray;
const targetX = 10;  // Final window X position
const startX = -650; // Offscreen start X position
const animationDuration = 300; // Animation duration in ms
let animationFrameId;

function createWindow() {
  win = new BrowserWindow({
    width: 650,
    height: 1000,
    x: startX,
    y: 15,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f0e17',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js') // optional
    }
  });

  win.loadFile('./index.html');

  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      slideOut();
    }
  });

  win.on('blur', () => {
    if (!app.isQuitting) {
      slideOut();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => slideIn()
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('My Electron App');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (win.isVisible()) {
      slideOut();
    } else {
      slideIn();
    }
  });
}

function easeInOut(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateWindow(startPos, endPos, duration, onComplete) {
  const startTime = Date.now();

  function animate() {
    const now = Date.now();
    const elapsed = now - startTime;
    let progress = elapsed / duration;
    if (progress > 1) progress = 1;

    const easedProgress = easeInOut(progress);
    const currentX = startPos + (endPos - startPos) * easedProgress;

    if (win && !win.isDestroyed()) {
      const bounds = win.getBounds();
      win.setBounds({ ...bounds, x: Math.round(currentX) });
    }

    if (progress < 1) {
      animationFrameId = setImmediate(animate);
    } else {
      if (onComplete) onComplete();
    }
  }

  animate();
}

function slideIn() {
  if (!win) return;
  if (animationFrameId) clearTimeout(animationFrameId);

  win.setBounds({ x: startX, y: 15, width: 650, height: 1000 });
  win.show();
  win.focus();

  animateWindow(startX, targetX, animationDuration);
}

function slideOut() {
  if (!win) return;
  if (animationFrameId) clearTimeout(animationFrameId);

  animateWindow(targetX, startX, animationDuration, () => {
    if (win && !win.isDestroyed()) {
      win.hide();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Launch app at startup
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe'),
  });

  const registered = globalShortcut.register('Control+Space', () => {
    if (win.isVisible()) {
      slideOut();
    } else {
      slideIn();
    }
  });

  if (!registered) {
    console.log('Failed to register Ctrl+Space hotkey');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
