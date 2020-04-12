import { isDef, isDefAll } from '../common';
import { effect, reactive } from '../reactive/reactivity';
import { useEffect } from './useEffect';

export interface StateType<T> {
    value: T;
    val: T;
    v: T;
}

const __IS_STATE__ = Symbol('__IS_STATE__');
export const isState = o => o[__IS_STATE__];

export const useState = <T>(initValue: T): StateType<T> => {
    const ret = Object.create(null);
    let value = initValue;
    function set(val: T) {
        // if (value === val) return
        // 这层不能脏检查！
        value = val;
    }
    function get(): T {
        return value;
    }
    Object.defineProperties(ret, {
        value: {
            enumerable: true,
            set,
            get,
        },
        val: {
            enumerable: true,
            set,
            get,
        },
        v: {
            enumerable: true,
            set,
            get,
        },
    });
    ret[__IS_STATE__] = true;
    return reactive<{ value: T; v: T; val: T }>(ret);
};

export const Stateify = <T>(value: T | StateType<T>) => {
    if (isState(value)) {
        return value as StateType<T>;
    }
    return useState(value as T);
};

type MapFn = <T>(_: T) => T;
const identity: MapFn = x => x;
const noop: MapFn = x => void 0;
const intercept = _ => { throw new Error('') }

const mkThrottleLink = (interval: number) => {
    let timer = 0;
    return <T>(v: T) =>
        new Promise<T>((resolve, reject) => {
            const now = Date.now();
            if (now - timer < interval) {
                reject();
                return;
            }
            timer = now;
            resolve(v);
        });
};

export const useValue = <T>(
    state: StateType<T>,
    outFn = identity,
    inFn = intercept,
    interval = -1,
) => {
    const value = useState(outFn(state.v));
    const outLink = mkThrottleLink(interval);
    const inLink = mkThrottleLink(interval);
    const setState = (v: T) => state.v = v;
    const setValue = (v: T) => value.v = v;
    effect(() =>
        outLink(state.v)
            .then(outFn)
            .then(setValue)
            .catch(identity),
    );
    effect(() =>
        inLink(value.v)
            .then(inFn)
            .then(setState)
            .then(outFn)
            .then(setValue)
            .catch(identity),
    );
    return value;
};
