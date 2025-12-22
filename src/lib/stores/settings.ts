import { writable } from 'svelte/store';

export interface SettingsState {
	audioEnabled: boolean;
	sfxVolume: number;
	musicVolume: number;
	skinGuessEnabled: boolean;
}

export const settings = writable<SettingsState>({
	audioEnabled: true,
	sfxVolume: 0.8,
	musicVolume: 0.4,
	skinGuessEnabled: true
});

