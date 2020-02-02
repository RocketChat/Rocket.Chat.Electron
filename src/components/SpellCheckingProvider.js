import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import spellChecking from '../services/spellChecking';
import { SPELL_CHECKING_DICTIONARIES_UPDATED } from '../actions';

const SpellCheckingContext = createContext();

export function SpellCheckingProvider({ children, service = spellChecking }) {
	const spellChecking = service;

	const dispatch = useDispatch();

	const spellCheckingDictionariesUpdated = useCallback(() => {
		dispatch({
			type: SPELL_CHECKING_DICTIONARIES_UPDATED,
			payload: {
				available: spellChecking.getAvailableDictionaries(),
				enabled: spellChecking.getEnabledDictionaries(),
			},
		});
	}, [dispatch, spellChecking]);

	useEffect(() => {
		spellChecking.setUp().then(() => {
			spellCheckingDictionariesUpdated();
		});

		window.addEventListener('beforeunload', ::spellChecking.tearDown);
		return ::spellChecking.tearDown;
	}, [spellChecking, spellCheckingDictionariesUpdated]);

	const value = useMemo(() => ({
		spellChecking,
		spellCheckingDictionariesUpdated,
	}), [spellChecking, spellCheckingDictionariesUpdated]);

	return <SpellCheckingContext.Provider children={children} value={value} />;
}

export const useCorrectionsForMisspelling = () => {
	const { spellChecking } = useContext(SpellCheckingContext);
	return useCallback(::spellChecking.getCorrectionsForMisspelling, [spellChecking]);
};

export const useMisspellingDectection = () => {
	const { spellChecking } = useContext(SpellCheckingContext);
	return useCallback(::spellChecking.getMisspelledWords, [spellChecking]);
};

export const useSpellCheckingDictionaryInstall = () => {
	const { spellChecking, spellCheckingDictionariesUpdated } = useContext(SpellCheckingContext);

	return useMemo(() => ({
		directory: spellChecking.getInstalledDictionariesDirectoryPath(),
		extension: spellChecking.getInstalledDictionariesExtension(),
		install: async (dictionaryName) => {
			await spellChecking.installDictionary(dictionaryName);
			spellCheckingDictionariesUpdated();
		},
	}), [spellChecking, spellCheckingDictionariesUpdated]);
};

export const useSpellCheckingDictionaries = () => {
	const { spellChecking, spellCheckingDictionariesUpdated } = useContext(SpellCheckingContext);

	const dictionaries = useSelector(({ spellCheckingDictionaries }) => spellCheckingDictionaries);

	return useMemo(() => ({
		dictionaries,
		toggleDictionary: async (dictionaryName, enabled) => {
			await spellChecking.toggleDictionary(dictionaryName, enabled);
			spellCheckingDictionariesUpdated();
		},
	}), [spellChecking, spellCheckingDictionariesUpdated, dictionaries]);
};
