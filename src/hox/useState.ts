import { isDef, isDefAll } from '../common';
import { reactive } from '../reactive/reactivity';
import { useEffect } from './useEffect';

export interface StateType<T> {
    value: T;
    val: T;
    v: T;
}

export const isState = o =>
    isDef(o) && isDefAll([o.value, o.val, o.v]) && o.value === o.val && o.value === o.v;

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
    return reactive<{ value: T; v: T; val: T }>(ret);
}


export const useValue = <T>(state: StateType<T>, mapFn: (v: T) => T) => {
    const value = useState(state.v)
    useEffect(() => {
        value.v = mapFn(state.v)
    })
    return value
}

