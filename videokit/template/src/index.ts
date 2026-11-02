import {registerRoot} from 'remotion';
import './fx/fingerprint'; // per-frame fingerprints for scripts/render.mjs (only active when it asks)
import {RemotionRoot} from './Root';

registerRoot(RemotionRoot);
