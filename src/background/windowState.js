// Simple module to help you remember the size and position of windows.
// Can be used for more than one window, just construct many
// instances of it and give each different name.

import { app } from 'electron';
import jetpack from 'fs-jetpack';
import { debounce } from 'lodash';

export default function (name, defaults) {

    let state = {
        width: defaults.width,
        height: defaults.height
    };

    const userDataDir = jetpack.cwd(app.getPath('userData'));
    const stateStoreFile = `window-state-${name}.json`;

    try {
        state = userDataDir.read(stateStoreFile, 'json') || state;
    } catch (err) {
        console.error(`Failed to load "${ name }" window state`);
        console.error(err);
    }

    const saveState = function (window) {
        state.isMaximized = window.isMaximized();
        state.isMinimized = window.isMinimized();
        state.isHidden = !window.isMinimized() && !window.isVisible();

        if (!state.isMaximized && !state.isHidden) {
            [ state.x, state.y ] = window.getPosition();
            [ state.width, state.height ] = window.getSize();
        }

        userDataDir.write(stateStoreFile, state, { atomic: true });
    };

    const loadState = function (window) {
        if (this.x !== undefined && this.y !== undefined) {
            window.setPosition(this.x, this.y, false);
        }

        if (this.width !== undefined && this.height !== undefined) {
            window.setSize(this.width, this.height, false);
        }

        this.isMaximized ? window.maximize() : window.unmaximize();
        this.isMinimized ? window.minimize() : window.restore();
        this.isHidden ? window.hide() : window.show();
    };

    return {
        get x () { return state.x && Math.floor(state.x); },
        get y () { return state.y && Math.floor(state.y); },
        get width () { return state.width && Math.floor(state.width); },
        get height () { return state.height && Math.floor(state.height); },
        get isMaximized () { return state.isMaximized; },
        get isMinimized () { return state.isMinimized; },
        get isHidden () { return state.isHidden; },
        saveState: debounce(saveState, 1000),
        loadState
    };
}
