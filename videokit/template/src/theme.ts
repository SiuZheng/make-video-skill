import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// One type family and a few colours, used everywhere (set the look per video in plan.md).
export const FONT = '"Inter", sans-serif';
export const INK = '#EAF2FF'; // text
export const SUB = '#A9BBDD'; // small text under it
export const GOLD = '#FFD66B'; // the accent: numbers, key words
export const BG = '#05060C'; // behind everything

loadFont({family: 'Inter', url: staticFile('fonts/Inter.ttf'), weight: '100 900'});
