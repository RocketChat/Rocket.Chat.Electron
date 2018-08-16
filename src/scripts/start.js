/* globals $ */

import { ipcRenderer } from 'electron';
import i18n from '../i18n/index.js';
import servers from './servers';
import sidebar from './sidebar';
import webview from './webview';
import tray from './tray';
import './menus';

sidebar.on('badge-setted', function () {
    const badge = sidebar.getGlobalBadge();
    tray.showTrayAlert(badge);
});

export const start = function () {
    const defaultInstance = 'https://open.rocket.chat';

    // connection check
    function online () {
        document.body.classList.remove('offline');
    }

    function offline () {
        document.body.classList.add('offline');
    }

    if (!navigator.onLine) {
        offline();
    }
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    // end connection check

    const form = document.querySelector('form');
    const hostField = form.querySelector('[name="host"]');
    const button = form.querySelector('[type="submit"]');
    const invalidUrl = form.querySelector('#invalidUrl');

    window.addEventListener('load', function () {
        hostField.focus();
    });

    function validateHost () {
        return new Promise(function (resolve, reject) {
            const execValidation = function () {
                invalidUrl.style.display = 'none';
                hostField.classList.remove('wrong');

                const host = hostField.value.trim();
                hostField.value = host;

                if (host.length === 0) {
                    button.value = i18n.__('Connect');
                    button.disabled = false;
                    resolve();
                    return;
                }

                button.value = i18n.__('Validating');
                button.disabled = true;

                servers.validateHost(host, 2000).then(function () {
                    button.value = i18n.__('Connect');
                    button.disabled = false;
                    resolve();
                }, function (status) {
                    // If the url begins with HTTP, mark as invalid
                    if (/^https?:\/\/.+/.test(host) || status === 'basic-auth') {
                        button.value = i18n.__('Invalid_url');
                        invalidUrl.style.display = 'block';
                        switch (status) {
                            case 'basic-auth':
                                invalidUrl.innerHTML = i18n.__('Auth_needed_try', '<b>username:password@host</b>');
                                break;
                            case 'invalid':
                                invalidUrl.innerHTML = i18n.__('No_valid_server_found');
                                break;
                            case 'timeout':
                                invalidUrl.innerHTML = i18n.__('Timeout_trying_to_connect');
                                break;
                        }
                        hostField.classList.add('wrong');
                        reject();
                        return;
                    }

                    // // If the url begins with HTTPS, fallback to HTTP
                    // if (/^https:\/\/.+/.test(host)) {
                    //     hostField.value = host.replace('https://', 'http://');
                    //     return execValidation();
                    // }

                    // If the url isn't localhost, don't have dots and don't have protocol
                    // try as a .rocket.chat subdomain
                    if (!/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(host)) {
                        hostField.value = `https://${host}.rocket.chat`;
                        return execValidation();
                    }

                    // If the url don't start with protocol try HTTPS
                    if (!/^https?:\/\//.test(host)) {
                        hostField.value = `https://${host}`;
                        return execValidation();
                    }
                });
            };
            execValidation();
        });
    }

    hostField.addEventListener('blur', function () {
        validateHost().then(function () {}, function () {});
    });

    ipcRenderer.on('certificate-reload', function (event, url) {
        hostField.value = url.replace(/\/api\/info$/, '');
        validateHost().then(function () {}, function () {});
    });

    ipcRenderer.on('render-taskbar-icon', (event, messageCount) => {
        // Create a canvas from unread messages
        function createOverlayIcon (messageCount) {
            const canvas = document.createElement('canvas');
            canvas.height = 128;
            canvas.width = 128;

            const ctx = canvas.getContext('2d');
            ctx.beginPath();

            ctx.fillStyle = 'red';
            ctx.arc(64, 64, 64, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            canvas.style.letterSpacing = '-4px';
            ctx.font = 'bold 92px sans-serif';
            ctx.fillText(String(Math.min(99, messageCount)), 64, 98);

            return canvas;
        }
        ipcRenderer.send('update-taskbar-icon', createOverlayIcon(messageCount).toDataURL(), String(messageCount));
    });

    const submit = function () {
        validateHost().then(function () {
            const input = form.querySelector('[name="host"]');
            let url = input.value;

            if (url.length === 0) {
                url = defaultInstance;
            }

            url = servers.addHost(url);
            if (url !== false) {
                sidebar.show();
                servers.setActive(url);
            }

            input.value = '';
        }, function () {});
    };

    hostField.addEventListener('keydown', function (ev) {
        if (ev.which === 13) {
            ev.preventDefault();
            ev.stopPropagation();
            submit();
            return false;
        }
    });

    form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        submit();
        return false;
    });

    $('.add-server').on('click', function () {
        servers.clearActive();
        webview.showLanding();
    });

    servers.restoreActive();
};

window.addEventListener('focus', function () {
    webview.focusActive();
});
