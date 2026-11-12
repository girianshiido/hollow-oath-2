const paths:Record<string,string>={
 sword:'M5 3l13 13m-8-9L7 10 3 3l7 4zm5 8 5 5m-7-2 5-5M4 20l4-4',
 dagger:'M17 3 7 13l4 4L21 7l-4-4ZM9 15l-6 6m1-7 6 6',
 shield:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',
 flame:'M13 2c2 6-5 6-3 11 2-1 3-3 3-3 6 6 5 11-1 12C3 21 2 14 6 9c0 4 2 4 2 4-2-7 4-8 5-11Z',
 snow:'M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4m12 14-1-4 4-1',
 heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
 target:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0-3v5m0 12v5M1 12h5m12 0h5',
 sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
 play:'m8 4 12 8-12 8V4Z',pause:'M8 4v16M16 4v16',next:'m9 5 7 7-7 7',back:'m15 5-7 7 7 7',
 camp:'M2 20 12 3l10 17H2Zm7 0 3-6 3 6M12 3v11',
 gem:'m7 3-5 6 10 13L22 9l-5-6H7Zm-5 6h20M7 3l5 19 5-19',
 coin:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3 5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6 2 3 3-1 1 3 3 2-1 3 1 3-3 2-1 3-3-1-2 3-2-3-3 1-1-3-3-2 1-3-1-3 3-2 1-3 3 1 2-3Z',
 sound:'M4 9h4l5-5v16l-5-5H4V9Zm12-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16',
 download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
 crown:'m3 6 4 5 5-8 5 8 4-5-3 14H6L3 6Z',
 book:'M12 5C7 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-4-2-9 1Zm0 0v15',
 close:'m6 6 12 12M6 18 18 6',bolt:'m13 2-9 12h7l-1 8 10-13h-8l1-7Z',
 skull:'M7 16H5v-5a7 7 0 0 1 14 0v5h-2v5H7v-5Zm1-5h1m6 0h1M10 17v4m4-4v4',
 star:'m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1 3-6Z',
 info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 7v7m0-10v.1'
};
export function icon(name:string,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]??paths.star}"/></svg>`;}
