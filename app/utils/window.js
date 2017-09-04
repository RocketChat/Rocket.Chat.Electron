import { BrowserWindow, app } from 'electron';
import { debounce } from 'lodash';
import store from './store';
import path from 'path';
import jetpack from 'fs-jetpack';

const windows = {};

function getWindow(name) {
  return windows[name];
}

function createWindow(name, opts) {
  const { page, ...rest } = opts;
  const window = new BrowserWindow({
    show: false,
    width: 500,
    height: 500,
    ...rest
  });
  let location = path.join(__dirname, 'app.html');
  if (process.env.NODE_ENV === 'development') {
    location = path.join(__dirname, '../app.html');
  }
  window.loadURL(`file://${location}${page ? `#${page}` : ''}`);
  window.webContents.on('did-finish-load', () => {
    window.show();
    window.focus();
  });
  windows[name] = window;
  window.on('closed', () => {
    windows[name] = null;
    delete windows[name];
  });
  return window;
}

function restoreWindowState(win, defaults, name = 'windowState') {
  const state = Object.assign({}, defaults, store.get(name));
  if (state.x !== undefined && state.y !== undefined) {
    win.setPosition(state.x, state.y, false);
  }
  if (state.width !== undefined && state.height !== undefined) {
    win.setSize(state.width, state.height, false);
  }
  let minWidth = 400;
  let minHeight = 300;

  if (process.platform === 'darwin') {
    minWidth = 600;
    minHeight = 400;
  }
  win.setMinimumSize(minWidth, minHeight);

  if (state.isMaximized) {
    win.maximize();
  }

  if (state.isMinimized) {
    win.minimize();
  }

  if (state.isHidden) {
    win.hide();
  }

  if (state.isFullScreen) {
    win.setFullScreen(true);
  }
}

function _saveWindowState(win, name = 'windowState') {
  const state = {};
  if (!win.isMaximized() && !win.isMinimized() && win.isVisible()) {
    const position = win.getPosition();
    const size = win.getSize();
    state.x = position[0];
    state.y = position[1];
    state.width = size[0];
    state.height = size[1];
  }
  state.isMaximized = win.isMaximized();
  state.isMinimized = win.isMinimized();
  state.isFullScreen = win.isFullScreen();
  state.isHidden = !win.isMinimized() && !win.isVisible();
  store.set(name, state);
}

function watchWindowState(win) {
  win.on('close', (event) => {
    if (win.forceClose) {
      _saveWindowState(win);
      return;
    }
    event.preventDefault();
    if (win.isFullScreen()) {
      win.once('leave-full-screen', () => {
        win.hide();
      });
      win.setFullScreen(false);
    } else {
      win.hide();
    }
    _saveWindowState(win);
  });

  app.on('before-quit', () => {
    _saveWindowState(win);
    win.forceClose = true; // eslint-disable-line
  });

  win.on('resize', () => {
    saveWindowState(win);
  });

  win.on('move', () => {
    saveWindowState(win);
  });
}

const saveWindowState = debounce(_saveWindowState, 1000);

export {
  createWindow,
  saveWindowState,
  restoreWindowState,
  watchWindowState,
  getWindow
};
