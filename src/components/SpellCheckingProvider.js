import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import spellChecking from '../services/spellChecking';

const SpellCheckingContext = createContext();

export function SpellCheckingProvider({ children }) {
	const [spellCheckingDictionaries, setSpellCheckingDictionaries] = useState([]);

	const refreshSpellCheckingDictionaries = () => {
		setSpellCheckingDictionaries(spellChecking.getAvailableDictionaries().map((dictionaryName) => ({
			name: dictionaryName,
			enabled: spellChecking.getEnabledDictionaries().includes(dictionaryName),
		})));
	};

	useEffect(() => {
		spellChecking.setUp().then(() => {
			refreshSpellCheckingDictionaries();
		});

		window.addEventListener('beforeunload', ::spellChecking.tearDown);
		return ::spellChecking.tearDown;
	}, []);

	const getCorrectionsForMisspelling = useMemo(() => ::spellChecking.getCorrectionsForMisspelling, []);
	const getMisspelledWords = useMemo(() => ::spellChecking.getMisspelledWords, []);

	const dictionaryInstall = useMemo(() => ({
		directory: spellChecking.getInstalledDictionariesDirectoryPath(),
		extension: spellChecking.getInstalledDictionariesExtension(),
		install: async (dictionaryName) => {
			await spellChecking.installDictionary(dictionaryName);
			refreshSpellCheckingDictionaries();
		},
	}), []);

	const dictionaries = useMemo(() => ({
		dictionaries: spellCheckingDictionaries,
		toggleDictionary: async (...args) => {
			await spellChecking.toggleDictionary(...args);
			refreshSpellCheckingDictionaries();
		},
	}), [spellCheckingDictionaries]);

	const value = useMemo(() => ({
		getCorrectionsForMisspelling,
		getMisspelledWords,
		dictionaryInstall,
		dictionaries,
	}), [
		getCorrectionsForMisspelling,
		getMisspelledWords,
		dictionaryInstall,
		dictionaries,
	]);

	return <SpellCheckingContext.Provider children={children} value={value} />;
}

export const useCorrectionsForMisspelling = () => useContext(SpellCheckingContext).getCorrectionsForMisspelling;
export const useMisspellingDectection = () => useContext(SpellCheckingContext).getMisspelledWords;
export const useSpellCheckingDictionaryInstall = () => useContext(SpellCheckingContext).dictionaryInstall;
export const useSpellCheckingDictionaries = () => useContext(SpellCheckingContext).dictionaries;
