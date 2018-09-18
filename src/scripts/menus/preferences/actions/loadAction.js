import jetpack from 'fs-jetpack';
import { preferencesStoreFile, userDataDir } from '../config/statics'

export default function () {

    const loadPreferences = function () {
        let loadPreferences = {};
        try {
            loadPreferences = userDataDir.read(preferencesStoreFile, 'json');
        } catch (err) {
            //load default values...
        }
        return loadPreferences;

    }

    return {
        loadPreferences: loadPreferences
    };
}
