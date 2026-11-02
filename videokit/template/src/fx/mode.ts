import {getInputProps} from 'remotion';

// How this render was asked for (scripts/render.mjs passes these as input props; a normal render and the
// Studio get the defaults):
// - a TikTok export (vk.py final --platform tiktok): no film grain and thinner dust. TikTok re-encodes every
//   upload hard, and fine noise that changes every frame is what turns into blur and blocks there;
// - a draft (vk.py animatic): no motion blur, so the quick low-res render for checking the pacing is fast.
const props = (typeof window === 'undefined' ? {} : getInputProps()) as {vkPlatform?: string; vkDraft?: boolean};
export const PLATFORM: string = props.vkPlatform ?? 'youtube';
export const DRAFT = Boolean(props.vkDraft);
