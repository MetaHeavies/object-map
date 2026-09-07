import {isMain} from '../skills/object-map/scripts/workspace.mjs';
import {installMain} from '../skills/object-map/scripts/install.mjs';
export {install} from '../skills/object-map/scripts/install.mjs';
if (isMain(import.meta.url)) installMain().catch(error => {console.error(error.message); process.exitCode = 1;});
