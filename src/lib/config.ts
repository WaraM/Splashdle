import { version as kitVersion } from '$app/environment';

// Central place to tweak the version labels shown in the UI.
export const APP_VERSION = kitVersion;

// Set to a string like "14.20" to force the displayed LoL patch.
// Leave empty to rely on the auto-detected DDragon version.
export const DATA_PATCH_OVERRIDE = '';
