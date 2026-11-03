import {defaults,type Settings} from './types';
/** One shipped art direction for everyone. No persisted personal preferences. */
export const appearance:Readonly<Settings>=Object.freeze({...defaults,background:"radial-gradient(circle at 50% 46%, #242424 0%, #171717 32%, #0b0b0b 65%, #030303 100%)",size:64,mode:"line"});
