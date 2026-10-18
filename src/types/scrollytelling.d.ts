// Ambient module declarations for Lenis, Howler, and GSAP
// Ensures TypeScript passes verification cleanly

declare module 'lenis' {
  export interface LenisOptions {
    duration?: number;
    easing?: (t: number) => number;
    orientation?: 'vertical' | 'horizontal';
    gestureOrientation?: 'vertical' | 'horizontal';
    smoothWheel?: boolean;
    wheelMultiplier?: number;
    touchMultiplier?: number;
    infinite?: boolean;
    [key: string]: unknown;
  }

  export default class Lenis {
    constructor(options?: LenisOptions);
    on(event: 'scroll', callback: (e: any) => void): void;
    off(event: 'scroll', callback: (e: any) => void): void;
    raf(time: number): void;
    destroy(): void;
    scrollTo(target: any, options?: any): void;
    start(): void;
    stop(): void;
    progress: number;
    scroll: number;
    velocity: number;
  }
}

declare module 'howler' {
  export interface HowlOptions {
    src: string[] | string;
    volume?: number;
    html5?: boolean;
    loop?: boolean;
    preload?: boolean;
    autoplay?: boolean;
    mute?: boolean;
    rate?: number;
    pool?: number;
    format?: string[];
    onload?: () => void;
    onloaderror?: (id: number, error: unknown) => void;
    onplay?: (id: number) => void;
    onend?: (id: number) => void;
    onpause?: (id: number) => void;
    onstop?: (id: number) => void;
    onmute?: (id: number) => void;
    onvolume?: (id: number) => void;
    onrate?: (id: number) => void;
    onseek?: (id: number) => void;
    onfade?: (id: number) => void;
    onunlock?: () => void;
    [key: string]: unknown;
  }

  export class Howl {
    constructor(options: HowlOptions);
    play(spriteOrId?: string | number): number;
    pause(id?: number): this;
    stop(id?: number): this;
    mute(muted?: boolean, id?: number): this;
    volume(volume?: number, id?: number): any;
    fade(from: number, to: number, duration: number, id?: number): this;
    rate(rate?: number, id?: number): any;
    seek(seek?: number, id?: number): any;
    loop(loop?: boolean, id?: number): any;
    state(): 'unloaded' | 'loading' | 'loaded';
    playing(id?: number): boolean;
    duration(id?: number): number;
    on(event: string, fn: Function, id?: number): this;
    once(event: string, fn: Function, id?: number): this;
    off(event: string, fn?: Function, id?: number): this;
    load(): this;
    unload(): void;
  }

  export interface HowlerGlobal {
    mute(muted: boolean): this;
    volume(volume?: number): any;
    stop(): this;
    unload(): this;
    codecs(ext: string): boolean;
    ctx: AudioContext;
    masterGain: GainNode;
    autoUnlock: boolean;
    html5PoolSize: number;
  }

  export const Howler: HowlerGlobal;
}

declare module 'gsap' {
  export interface TweenVars {
    [key: string]: any;
  }

  export interface TimelineVars {
    [key: string]: any;
  }

  export class Timeline {
    to(targets: any, vars: TweenVars, position?: any): this;
    from(targets: any, vars: TweenVars, position?: any): this;
    fromTo(targets: any, fromVars: TweenVars, toVars: TweenVars, position?: any): this;
    add(child: any, position?: any): this;
    call(callback: Function, params?: any[], position?: any): this;
    kill(): void;
    revert(): this;
    play(): this;
    pause(): this;
    progress(value?: number): any;
    time(value?: number): any;
    duration(value?: number): any;
  }

  export interface MatchMedia {
    add(query: string, func: () => void | (() => void)): this;
    revert(): void;
  }

  export interface GsapTicker {
    add(callback: Function): void;
    remove(callback: Function): void;
    lagSmoothing(threshold?: number, adjustedLag?: number): void;
    fps(value?: number): any;
  }

  export interface GsapStatic {
    registerPlugin(...plugins: any[]): void;
    timeline(vars?: TimelineVars): Timeline;
    to(targets: any, vars: TweenVars): any;
    from(targets: any, vars: TweenVars): any;
    fromTo(targets: any, fromVars: TweenVars, toVars: TweenVars): any;
    set(targets: any, vars: TweenVars): any;
    matchMedia(scope?: any): MatchMedia;
    ticker: GsapTicker;
    utils: {
      toArray<T = HTMLElement>(targets: any): T[];
      [key: string]: any;
    };
    [key: string]: any;
  }

  const gsap: GsapStatic;
  export default gsap;
}

declare module 'gsap/ScrollTrigger' {
  export class ScrollTrigger {
    static create(vars: any): ScrollTrigger;
    static update(): void;
    static refresh(safe?: boolean): void;
    static getAll(): ScrollTrigger[];
    progress: number;
    direction: number;
    kill(reset?: boolean): void;
    refresh(): void;
    [key: string]: any;
  }
}

declare module '@gsap/react' {
  export function useGSAP(
    callback: (context: any) => void | (() => void),
    dependencies?: any | { scope?: any; dependencies?: any[]; revertOnUpdate?: boolean }
  ): { context: any };
}
