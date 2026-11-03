import release from '../../../config/release.json';
// Public scope omits locally authorized captures/supplements. This is exclusion,
// never a rights grant; immutable inputs remain available to local validation.
export const isPublicPublication = release.mode === 'public';
export const restrictedSourceNotice = 'This source excerpt is not included in the public edition. The independently authored teaching model and recorded research evidence remain available; source rights are separate.';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const profilePath = fileURLToPath(new URL('../../../config/source-profile.json', import.meta.url));
export const isPublicSource = JSON.parse(readFileSync(profilePath, 'utf8')).profile === 'public-site';
if (!isPublicSource || !isPublicPublication) throw new Error('Public-source profile requires the public edition');
