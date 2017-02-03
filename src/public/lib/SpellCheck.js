const checker = require('spellchecker');
const { remote, webFrame } = require('electron');

const webContents = remote.getCurrentWebContents();
let menu = new remote.Menu();

const path = remote.require('path');

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

    constructor () {
        this.enabledDictionaries = [];
        this.contractions = this.getContractions();
        this.loadAvailableDictionaries();
        this.loadEnabledDictionaries();

        this.languagesMenu = {
            label: 'Spelling languages',
            submenu: this.availableDictionaries.map((dictionary) => {
                const menu = {
                    label: dictionary,
                    type: 'checkbox',
                    checked: this.enabledDictionaries.indexOf(dictionary) > -1,
                    click: (menuItem) => {
                        menu.checked = menuItem.checked;
                        if (menuItem.checked) {
                            this.enabledDictionaries.push(dictionary);
                        } else {
                            this.enabledDictionaries.splice(this.enabledDictionaries.indexOf(dictionary), 1);
                        }
                        this.saveEnabledDictionaries();
                    }
                };
                return menu;
            })
        };
    }

    loadEnabledDictionaries () {
        if (this.dictionaries) {
            this.enabledDictionaries = this.dictionaries.filter((dict) => this.availableDictionaries.indexOf(dict) !== -1);
        }
        if (this.enabledDictionaries.length === 0) {
            if (this.userLanguage) {
                if (this.availableDictionaries.indexOf(this.userLanguage) !== -1) {
                    this.enabledDictionaries.push(this.userLanguage);
                } else if (this.userLanguage.indexOf('_') !== -1) {
                    const langPart = this.userLanguage.split('_')[0];
                    if (this.availableDictionaries.indexOf(langPart) !== -1) {
                        this.enabledDictionaries.push(langPart);
                    }
                }
            }

            let navigatorLanguage = navigator.language.replace('-', '_');
            if (this.availableDictionaries.indexOf(navigatorLanguage) !== -1) {
                this.enabledDictionaries.push(navigatorLanguage);
            }
            if (navigatorLanguage.indexOf('_') !== -1) {
                navigatorLanguage = navigatorLanguage.split('_')[0];
                if (this.availableDictionaries.indexOf(navigatorLanguage) !== -1) {
                    this.enabledDictionaries.push(navigatorLanguage);
                }
            }

            let defaultLanguage = 'en_US';
            if (this.availableDictionaries.indexOf(defaultLanguage) !== -1) {
                this.enabledDictionaries.push(defaultLanguage);
            }
            defaultLanguage = defaultLanguage.split('_')[0];
            if (this.availableDictionaries.indexOf(defaultLanguage) !== -1) {
                this.enabledDictionaries.push(defaultLanguage);
            }
        }

        this.enabledDictionaries = this.enabledDictionaries.filter((dict) => this.availableDictionaries.indexOf(dict) !== -1);
    }

    loadAvailableDictionaries () {
        this.availableDictionaries = checker.getAvailableDictionaries().sort();
        if (this.availableDictionaries.length === 0) {
            this.dictionariesPath = path.join(remote.app.getAppPath(), '../dictionaries');
            this.availableDictionaries = [
                'en_US',
                'es_ES',
                'pt_BR'
            ];
        } else {
            this.availableDictionaries = this.availableDictionaries.map((dict) => dict.replace('-', '_'));
        }
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
                label: 'Undo',
                role: 'undo'
            },
            {
                label: 'Redo',
                role: 'redo'
            },
            {
                type: 'separator'
            },
            {
                label: 'Cut',
                role: 'cut',
                accelerator: 'CommandOrControl+X',
            },
            {
                label: 'Copy',
                role: 'copy',
                accelerator: 'CommandOrControl+C',
            },
            {
                label: 'Paste',
                role: 'paste',
                accelerator: 'CommandOrControl+V',
            },
            {
                label: 'Select All',
                role: 'selectall',
                accelerator: 'CommandOrControl+A',
            }
        ];
    }

    saveEnabledDictionaries () {
        localStorage.setItem('spellcheckerDictionaries', JSON.stringify(this.enabledDictionaries));
    }

    isCorrect (text) {
        if (this.enabledDictionaries.length === 0 || this.contractions[text.toLocaleLowerCase()]) {
            return true;
        }

        for (let i = 0; i < this.enabledDictionaries.length; i++) {
            checker.setDictionary(this.enabledDictionaries[i], this.dictionariesPath);
            if (!checker.isMisspelled(text)) {
                return true;
            }
        }

        return false;
    }

    getCorrections (text) {
      // Create an array of arrays of corrections
      // One array of corrections per language
        let allCorrections = [];
        this.enabledDictionaries.forEach((enabledDictionary) => {
            if (this.availableDictionaries.indexOf(enabledDictionary) === -1) {
                return;
            }

            checker.setDictionary(enabledDictionary, this.dictionariesPath);
            const languageCorrections = checker.getCorrectionsForMisspelling(text);
            if (languageCorrections.length > 0) {
                allCorrections.push(languageCorrections);
            }
        });

      // Get the size of biggest array
        let length = 0;
        allCorrections.forEach((items) => {
            length = Math.max(length, items.length);
        });

      // Merge all arrays until the size of the biggest array
      // To get the best suggestions of each language first
      // Ex: [[1,2,3], [a,b]] => [1,a,2,b,3]
        const corrections = [];
        for (let i = 0; i < length; i++) {
            for (var j = 0; j < allCorrections.length; j++) {
                if (allCorrections[j][i]) {
                    corrections.push(allCorrections[j][i]);
                }
            }
        }

      // Remove duplicateds
        corrections.forEach((item, index) => {
            const dupIndex = corrections.indexOf(item, index+1);
            if (dupIndex > -1) {
                corrections.splice(dupIndex, 1);
            }
        });

        return corrections;
    }

    setupContextMenuListener () {
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault();

            const template = this.getMenu();

            if (this.languagesMenu) {
                template.unshift({ type: 'separator' });
                template.unshift(this.languagesMenu);
            }

            setTimeout(() => {
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
                                const morSuggestions = {
                                    label: 'More spelling suggestions',
                                    submenu: suggestions.slice(maxItems)
                                };
                                template.unshift(morSuggestions);
                            }

                            template.unshift.apply(template, suggestions.slice(0, maxItems));
                        } else {
                            template.unshift({ label: 'no suggestions', enabled: false });
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
