import { StateType } from "./hox/useState";

export const __DEV__ = false;
export const __IE__DEV__ = false;

export const isDOM = (typeof Node === 'function') ?
    (obj) => obj instanceof Node :
    (obj) => obj && typeof obj === 'object' && obj.nodeType && typeof obj.nodeName === 'string'

export function exclude(obj: object, excludeKeys: string[]): object {
    excludeKeys = excludeKeys || [];
    excludeKeys.push("constructor", "__proto__");
    const ret = Object.create(null);
    for (const key in obj) {
        if (excludeKeys.indexOf(key) !== -1) { continue; }
        const value = obj[key];
        ret[key] = value;
    }
    const proto = Object.getPrototypeOf(obj);
    Object.getOwnPropertyNames(proto).forEach((key) => {
        if (excludeKeys.indexOf(key) !== -1) { return; }
        const value = obj[key];
        ret[key] = value;
    });
    return ret;
}
/* tslint:disable */
export function ctxCall(code: string): Function {
    return new Function("ctx", "with(ctx){return (" + code + ")}");
}
/* tslint:enable */
export function nodeToFragment(el: Node): DocumentFragment {
    const frag = document.createDocumentFragment();
    let child;
    while (true) {
        child = el.firstChild;
        if (!child) {
            break;
        }
        frag.appendChild(child);
        child.$lastParentNode = el;
    }
    return frag;
}

export function isElementNode(node: HTMLElement): boolean {
    return node.nodeType === 1;
}

export function isTextNode(node: HTMLElement): boolean {
    return node.nodeType === 3;
}

export function objectHash(obj: object): number {
    /* tslint:disable */
    const content = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const character = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
    /* tslint:enable */
}

export function likeHash(a: number, b: number, precision: number = 0.8): boolean {
    const as = a + "";
    const bs = b + "";
    let end = (a + "").length;
    end = Math.ceil(precision * end);
    return as.slice(0, end) === bs.slice(0, end);
}

export function isDef(obj: any): boolean {
    return obj !== undefined && obj !== null;
}

export function isUnDef(obj: any): boolean {
    return obj === undefined || obj === null;
}

export function isDefAll(arr: any, ...arg: any[]): boolean {
    if (!Array.isArray(arr)) {
        arr = [arr]
    }
    if (Array.isArray(arg)) {
        arr = arr.concat(arg)
    }
    return arr.length ? arr.reduce((r, o) => r && isDef(o), true) : false
}

export function isUnDefAll(arr: any, ...arg: any[]): boolean {
    if (!Array.isArray(arr)) {
        arr = [arr]
    }
    if (Array.isArray(arg)) {
        arr = arr.concat(arg)
    }
    return arr.length ? arr.reduce((r, o) => r && isUnDef(o), true) : false
}

const ua = navigator.userAgent;
const isIE = ua.indexOf("compatible") > -1 && ua.indexOf("MSIE") > -1;
export const isEdge = ua.indexOf("Edge") > -1 && !isIE;

export function randID(): number {
    return Math.ceil(Math.random() * Number.MAX_SAFE_INTEGER);
}

const protoToString = Object.prototype.toString;
export function isType(type: string): (o: any) => boolean {
    return (o: any): boolean => protoToString.call(o) === type;
}

const UniqueIdTemplate = 'xxxxxxxx-xxxx'
export const UniqueId = () => UniqueIdTemplate.replace(/[xy]/g, c => (Math.random() * 16 | 0).toString(16));

const IncludedCache = new Map<string, boolean>();

export const isIncluded = (name: string) => {
    if (IncludedCache.has(name)) {
        return true
    }
    const js = /js$/i.test(name);
    const es = document.getElementsByTagName(js ? 'script' : 'link');
    for (var i = 0; i < es.length; i++) {
        if (es[i][js ? 'src' : 'href'].indexOf(name) != -1) {
            IncludedCache.set(name, true);
            return true
        }
    }
    return false;
}

export function flatten(arr: any[]) {
    return arr.reduce((prev, cur) => {
        return prev.concat(Array.isArray(cur) ? flatten(cur) : cur)
    }, [])
}


// 逻辑是没问题，但是为了应付类型检查，很不优雅...
export function GetValue<T>(x: T | StateType<T>): T {
    if (typeof x !== 'object') {
        return x
    }
    x = x as StateType<T>
    if (isDefAll([x.value, x.val, x.v]) && x.value === x.val && x.value === x.v) {
        return x.value
    } else {
        return x as unknown as T
    }
}

type func = (...arg: any[]) => any
export const FuncType = (fn: func): string => fn ? fn.constructor.name : ''
export const isAsyncFunction = (f: func) => FuncType(f) === 'AsyncFunction'
export const isGeneratorFunction = (f: func) => FuncType(f) === 'GeneratorFunction'
export const isAsyncGeneratorFunction = (f: func) => FuncType(f) === 'AsyncGeneratorFunction'

export const excludeKeysObj = (obj: object, keys: string[]) => {
    const ret = {};
    Object.keys(obj)
        .filter(key => !keys.includes(key))
        .forEach(key => ret[key] = obj[key])
    return ret
}

export const includeKeysObj = (obj: object, keys: string[]) => excludeKeysObj(obj, Object.keys(obj).filter(key => !keys.includes(key)))
