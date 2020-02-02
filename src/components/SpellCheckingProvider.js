import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
	SPELL_CHECKING_DICTIONARIES_UPDATED,
	SPELL_CHECKING_READY,
} from '../actions';
import spellChecking from '../services/spellChecking';

const SpellCheckingContext = createContext();

export function SpellCheckingProvider({ children, service = spellChecking }) {
	const spellChecking = service;

	const dispatch = useDispatch();

	useEffect(() => {
		spellChecking.setUp().then(() => {
			dispatch({
				type: SPELL_CHECKING_READY,
				payload: {
					available: spellChecking.getAvailableDictionaries(),
					enabled: spellChecking.getEnabledDictionaries(),
				},
			});
		});

		window.addEventListener('beforeunload', ::spellChecking.tearDown);
		return ::spellChecking.tearDown;
	}, [spellChecking, dispatch]);

	const spellCheckingDictionariesUpdated = useCallback(() => {
		dispatch({
			type: SPELL_CHECKING_DICTIONARIES_UPDATED,
			payload: {
				available: spellChecking.getAvailableDictionaries(),
				enabled: spellChecking.getEnabledDictionaries(),
			},
		});
	}, [dispatch, spellChecking]);

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
