import { isState, StateType } from './useState';

const MAX_GET_DEPTH = 20;
export const getFuncVal = (fn, depth = 0) => {
    if (depth >= MAX_GET_DEPTH) {
        return fn;
    }
    if (fn instanceof Function) {
        return getFuncVal(fn(), depth + 1);
    }
    return fn;
};

// 逻辑是没问题，但是为了应付类型检查，很不优雅...
export function GetValue<T>(x: T | StateType<T>): T {
    if (x instanceof Function) {
        return GetValue(getFuncVal(x));
    }
    if (typeof x !== 'object') {
        return x;
    }
    x = x as StateType<T>;
    if (isState(x)) {
        return GetValue([x.value, x.val, x.v][0]);
    }
    return (x as unknown) as T;
}

const isDefObject = o => o !== undefined && o !== null;

export const isDef = (arr: any, ...arg: any[]): boolean => {
    if (!Array.isArray(arr)) {
        arr = [arr];
    }
    arr = [...arr, ...arg];
    return arr.length ? arr.reduce((r, o) => r && isDefObject(o), true) : false;
};

const shuffle = (arr: any[]) => {
    for (
        let j, x, i = arr.length;
        i;
        j = ~~(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x
    ) { }
    return arr;
};
const shuffleStr = (s: string) => shuffle(s.split('')).join('');
const performanceHEX = () =>
    shuffleStr(
        parseInt(
            performance
                .now()
                .toString()
                .replace('.', ''),
            10,
        ).toString(16),
    );
const DateHEX = () => shuffleStr(Date.now().toString(16));
const RandomHEX = () =>
    shuffleStr(
        Math.random()
            .toString(16)
            .slice(2),
    );
export const UniqueId = (gap = '_', unit = 6, part = 3) =>
    shuffle(
        Array.from(
            `${performanceHEX()}${DateHEX()}${RandomHEX()}`.matchAll(new RegExp(`.{${unit}}`, 'g')),
        ),
    )
        .slice(0, part)
        .join(gap);

export const throttle = (fn, time = 500) => {
    let canRun = true;
    return (...args) => {
        if (!canRun) {
            return;
        }
        canRun = false;
        setTimeout(() => {
            fn.apply(null, args);
            canRun = true;
        }, time);
    };
};

export const debounce = (fn, time = 500) => {
    let timeout = null;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            fn.apply(null, args);
        }, time);
    };
};
