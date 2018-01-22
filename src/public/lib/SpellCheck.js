const os = require('os');
const fs = require('fs');
const checker = require('spellchecker');
const { remote, webFrame, shell } = require('electron');
const { MenuItem, dialog } = remote;
const i18n = require('../../i18n/index');

const webContents = remote.getCurrentWebContents();
let menu = new remote.Menu();

const path = remote.require('path');
const isWindows = ['win32', 'win64'].indexOf(os.platform()) !== -1;

class SpellCheck {

    get userLanguage () {
        const lang = localStorage.getItem('userLanguage');
        if (lang) {
            return lang.replace('-', '_');
        }
    }

    get dictionaries () {
        const dictionaries = localStorage.getItem('spellcheckerDictionaries');
        if (dictionaries) {
            const result = JSON.parse(dictionaries);
            if (Array.isArray(result)) {
                return result;
            }
        }
    }

    constructor () {
        this.enabledDictionaries = [];
        this.contractions = this.getContractions();
        this.loadAvailableDictionaries();
        this.setEnabledDictionaries();

        this.languagesMenu = {
            label: i18n.__('Spelling_languages'),
            submenu: this.availableDictionaries.map((dictionary) => {
                const menu = {
                    label: dictionary,
                    type: 'checkbox',
                    checked: this.enabledDictionaries.includes(dictionary),
                    click: (menuItem) => {
                        menu.checked = menuItem.checked;
                        // If not using os dictionary then limit to only 1 language
                        if (!this.multiLanguage && this.languagesMenu.submenu) {
                            this.languagesMenu.submenu.forEach((m) => {
                                if (m.label !== menuItem.label) {
                                    m.checked = false;
                                }
                            });
                        }
                        if (menuItem.checked) {
                            this.setEnabled(dictionary);
                        } else {
                            this.disable(dictionary);
                        }
                        this.saveEnabledDictionaries();
                    }
                };
                return menu;
            })
        };

        this.browseForLanguageMenu = new MenuItem({
            label: i18n.__('Browse_for_language'),
            click: () => {
                dialog.showOpenDialog({
                    title: i18n.__('Open_Language_Dictionary'),
                    defaultPath: this.dictionariesPath,
                    filters: {name: 'Dictionaries', extensions: ['aff', 'dic']},
                    properties: ['openFile', 'multiSelections']
                },
                (filePaths) => { this.installDictionariesFromPaths(filePaths); }
                );
            }
        });
    }

    /**
     * Set enabled dictionaries on load
     * Either sets enabled dictionaries to saved preferences, or enables the first
     * dictionary that is valid based on system (defaults to en_US)
     */
    setEnabledDictionaries () {
        const dictionaries = this.dictionaries;
        if (dictionaries) {
            // Dictionary disabled
            if (dictionaries.length === 0) {
                return;
            }
            if (this.setEnabled(dictionaries)) {
                return;
            }
        }

        if (this.userLanguage) {
            if (this.setEnabled(this.userLanguage)) {
                return;
            }
            if (this.userLanguage.includes('_') && this.setEnabled(this.userLanguage.split('_')[0])) {
                return;
            }
        }

        const navigatorLanguage = navigator.language.replace('-', '_');
        if (this.setEnabled(navigatorLanguage)) {
            return;
        }

        if (navigatorLanguage.includes('_') && this.setEnabled(navigatorLanguage.split('_')[0])) {
            return;
        }

        if (this.setEnabled('en_US')) {
            return;
        }

        if (!this.setEnabled('en')) {
            console.info('Unable to set a language for the spell checker - Spell checker is disabled');
        }

    }

    loadAvailableDictionaries () {
        this.availableDictionaries = checker.getAvailableDictionaries().sort();
        if (this.availableDictionaries.length === 0) {
            this.multiLanguage = false;
            // Dictionaries path is correct for build
            this.dictionariesPath = path.join(remote.app.getAppPath(), '../dictionaries');
            this.getDictionariesFromInstallDirectory();
        } else {
            this.multiLanguage = !isWindows;
            this.availableDictionaries = this.availableDictionaries.map((dict) => dict.replace('-', '_'));
        }
    }

    /**
     * Installs all of the dictionaries specified in filePaths
     * Copies dicts into our dictionary path and adds them to availableDictionaries
     */
    installDictionariesFromPaths (dictionaryPaths) {
        for (const dictionaryPath of dictionaryPaths) {
            const dictionaryFileName = dictionaryPath.split(path.sep).pop();
            const dictionaryName = dictionaryFileName.slice(0, -4);
            const newDictionaryPath = path.join(this.dictionariesPath, dictionaryFileName);

            this.copyDictionaryToInstallDirectory(dictionaryName, dictionaryPath, newDictionaryPath);
        }
    }

    copyDictionaryToInstallDirectory (dictionaryName, oldPath, newPath) {
        fs.createReadStream(oldPath).pipe(fs.createWriteStream(newPath)
            .on('error', (errorMessage) => {
                dialog.showErrorBox(i18n.__('Error'), i18n.__('Error copying dictionary file') + `: ${dictionaryName}`);
                console.error(errorMessage);
            })
            .on('finish', () => {
                if (!this.availableDictionaries.includes(dictionaryName)) {
                    this.availableDictionaries.push(dictionaryName);
                }
            }));
    }

    getDictionariesFromInstallDirectory () {
        if (this.dictionariesPath) {
            const fileNames = fs.readdirSync(this.dictionariesPath);
            for (const fileName of fileNames) {
                const dictionaryExtension = fileName.slice(-3);
                const dictionaryName = fileName.slice(0, -4);
                if (!this.availableDictionaries.includes(dictionaryName)
                    && (dictionaryExtension === 'aff' || dictionaryExtension === 'dic')) {
                    this.availableDictionaries.push(dictionaryName);
                }
            }
        }
    }

    setEnabled (dictionaries) {
        dictionaries = [].concat(dictionaries);
        let result = false;
        for (let i = 0; i < dictionaries.length; i++) {
            if (this.availableDictionaries.includes(dictionaries[i])) {
                result = true;
                this.enabledDictionaries.push(dictionaries[i]);
                // If using Hunspell or Windows then only allow 1 language for performance reasons
                if (!this.multiLanguage) {
                    this.enabledDictionaries = [dictionaries[i]];
                    checker.setDictionary(dictionaries[i], this.dictionariesPath);
                    return true;
                }
            }
        }
        return result;
    }

    disable (dictionary) {
        const pos = this.enabledDictionaries.indexOf(dictionary);
        if (pos !== -1) {
            this.enabledDictionaries.splice(pos, 1);
        }
    }

    getContractions () {
        const contractions = [
            "ain't", "aren't", "can't", "could've", "couldn't", "couldn't've", "didn't", "doesn't", "don't", "hadn't",
            "hadn't've", "hasn't", "haven't", "he'd", "he'd've", "he'll", "he's", "how'd", "how'll", "how's", "I'd",
            "I'd've", "I'll", "I'm", "I've", "isn't", "it'd", "it'd've", "it'll", "it's", "let's", "ma'am", "mightn't",
            "mightn't've", "might've", "mustn't", "must've", "needn't", "not've", "o'clock", "shan't", "she'd", "she'd've",
            "she'll", "she's", "should've", "shouldn't", "shouldn't've", "that'll", "that's", "there'd", "there'd've",
            "there're", "there's", "they'd", "they'd've", "they'll", "they're", "they've", "wasn't", "we'd", "we'd've",
            "we'll", "we're", "we've", "weren't", "what'll", "what're", "what's", "what've", "when's", "where'd",
            "where's", "where've", "who'd", "who'll", "who're", "who's", "who've", "why'll", "why're", "why's", "won't",
            "would've", "wouldn't", "wouldn't've", "y'all", "y'all'd've", "you'd", "you'd've", "you'll", "you're", "you've"
        ];

        const contractionMap = contractions.reduce((acc, word) => {
            acc[word.replace(/'.*/, '')] = true;
            return acc;
        }, {});

        return contractionMap;
    }

    enable () {
        webFrame.setSpellCheckProvider('', false, {
            spellCheck: (text) => this.isCorrect(text)
        });

        this.setupContextMenuListener();
    }

    getMenu () {
        return [
            {
                label: i18n.__('Undo'),
                role: 'undo'
            },
            {
                label: i18n.__('Redo'),
                role: 'redo'
            },
            {
                type: 'separator'
            },
            {
                label: i18n.__('Cut'),
                role: 'cut',
                accelerator: 'CommandOrControl+X',
            },
            {
                label: i18n.__('Copy'),
                role: 'copy',
                accelerator: 'CommandOrControl+C',
            },
            {
                label: i18n.__('Paste'),
                role: 'paste',
                accelerator: 'CommandOrControl+V',
            },
            {
                label: i18n.__('Select_All'),
                role: 'selectall',
                accelerator: 'CommandOrControl+A',
            }
        ];
    }

    saveEnabledDictionaries () {
        localStorage.setItem('spellcheckerDictionaries', JSON.stringify(this.enabledDictionaries));
    }

    isCorrect (text) {
        if (!this.enabledDictionaries.length || this.contractions[text.toLocaleLowerCase()]) {
            return true;
        }

        if (this.multiLanguage) {
            for (let i = 0; i < this.enabledDictionaries.length; i++) {
                checker.setDictionary(this.enabledDictionaries[i]);
                if (!checker.isMisspelled(text)) {
                    return true;
                }
            }
        } else {
            return !checker.isMisspelled(text);
        }
        return false;
    }

    getCorrections (text) {
        if (!this.multiLanguage) {
            return checker.getCorrectionsForMisspelling(text);
        }

        const allCorrections = this.enabledDictionaries.map((dictionary) => {
            checker.setDictionary(dictionary);
            return checker.getCorrectionsForMisspelling(text);
        }).filter((c) => c.length > 0);

        const length = Math.max(...allCorrections.map((a) => a.length));

        // Get the best suggestions of each language first
        const corrections = [];
        for (let i = 0; i < length; i++) {
            corrections.push(...allCorrections.map((c) => c[i]).filter((c) => c));
        }

        // Remove duplicates
        return [...new Set(corrections)];
    }

    setupContextMenuListener () {
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault();

            const template = this.getMenu();

            if (this.languagesMenu && this.browseForLanguageMenu) {
                template.unshift({ type: 'separator' });
                if (this.dictionariesPath) {
                    template.unshift(this.browseForLanguageMenu);
                }
                template.unshift(this.languagesMenu);
            }

            setTimeout(() => {
                if (event.target.nodeName === 'A') {
                    const targetLink = event.target.href;

                    template.unshift({
                        label: i18n.__('Open_Link'),
                        click: () => {
                            shell.openExternal(targetLink);
                        }
                    });
                }

                if (['TEXTAREA', 'INPUT'].indexOf(event.target.nodeName) > -1) {
                    const text = window.getSelection().toString().trim();
                    if (text !== '' && !this.isCorrect(text)) {
                        const options = this.getCorrections(text);
                        const maxItems = Math.min(options.length, 6);

                        if (maxItems > 0) {
                            const suggestions = [];
                            const onClick = function (menuItem) {
                                webContents.replaceMisspelling(menuItem.label);
                            };

                            for (let i = 0; i < options.length; i++) {
                                const item = options[i];
                                suggestions.push({ label: item, click: onClick });
                            }

                            template.unshift({ type: 'separator' });

                            if (suggestions.length > maxItems) {
                                const moreSuggestions = {
                                    label: i18n.__('More_spelling_suggestions'),
                                    submenu: suggestions.slice(maxItems)
                                };
                                template.unshift(moreSuggestions);
                            }

                            template.unshift.apply(template, suggestions.slice(0, maxItems));
                        } else {
                            template.unshift({ label: i18n.__('No_suggestions'), enabled: false });
                        }
                    }
                }

                menu = remote.Menu.buildFromTemplate(template);
                menu.popup(remote.getCurrentWindow(), undefined, undefined, 5);
            }, 0);
        }, false);
    }
}

module.exports = SpellCheck;
