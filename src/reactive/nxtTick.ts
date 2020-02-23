// https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/
// import { effect } from './reactivity/reactivity'

const waiting = new WeakSet<any>();
const p = Promise && Promise.resolve();

declare global {
    interface Window {
        setImmediate: any;
    }
}

let nxtCall;
if (p) {
    nxtCall = (cb: () => any) => p.then(() => cb());
} else {
    nxtCall = (cb: () => any) => (window.setImmediate || window.setTimeout)((_) => cb(), 0);
}

export const nextTick = (() => {
    return (cb: () => any): Promise<any> => {
        if (waiting.has(cb)) {
            return;
        } else {
            waiting.add(cb);
        }
        return nxtCall(cb)
            .then(() => waiting.delete(cb));
    };
})();

const waittingKeyCall = new WeakMap<any>()

const callWaiting = (key: any) => {
    nxtCall(() => {
        waittingKeyCall.get(key)()
        waittingKeyCall.delete(key)
    })
}

export const nextTickWithKey = (key: any, cb: () => void) => {
    if (!waittingKeyCall.has(key)) {
        nxtCall(() => callWaiting(key))
    }
    waittingKeyCall.set(key, cb)
}