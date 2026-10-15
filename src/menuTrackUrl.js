// "104. snow (1)-loop.wav" → assets/snow-loop.mp3 (mono 40 kbps, embutida no html).
import url from '../assets/snow-loop.mp3';
export const SNOW_LOOP_URL = url;
export const SNOW_LOOP_SECS = 2299008 / 48000;   // duração exata do WAV (47,896 s), para o loop sem emenda (ignora o silêncio do MP3)
