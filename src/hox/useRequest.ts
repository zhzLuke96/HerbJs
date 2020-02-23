import { reactive, effect as Effect } from '../reactive/reactivity';
import { useState } from './useState';

const IdleCallback = (window as any).requestIdleCallback || (window as any).requestAnimationFrame
const __setInterval = (cb, interval) => {
    let now = Date.now
    let stime = now()
    let etime = stime
    let loop = () => {
        this.intervalTimer = IdleCallback(loop)
        etime = now()
        if (etime - stime >= interval) {
            stime = now()
            etime = stime
            cb()
        }
    }
    this.intervalTimer = IdleCallback(loop)
    return this.intervalTimer
}

interface RequestOptions {
    pollingInterval?: number    // 轮询间隔
    dedupe?: boolean            // 去除重复调用
    // onErrorRetry?: () => void   // 出错重试回调
}

// [TODO] 增加 loding error 的接口

type RequestFetcher = (...args: any[]) => Promise<any>
type IArgsFn = () => string | null | any[]
type IArgs = string | null | IArgsFn

const CONCURRENT_PROMISES = {}

const ArrHash = (arr: any[]): string => arr.reduce((all, v) => all + String(v), '')

const getRets = (fn: IArgsFn): any[] => {
    const Rets = fn()
    if (Array.isArray(Rets)) { return Rets }
    return [Rets]
}

export const useRequest = (
    fetchArgs: IArgs,
    fetcher: RequestFetcher = fetch,
    options: RequestOptions = {}
) => {
    if (fetcher === null) {
        fetcher = fetch
    }
    const resp = reactive({ data: null as any });
    const error = useState<Error>(null);
    const ret = {
        resp,
        error,
        revalidate: () => void (0)
    }

    let requestArgs: any[] = []

    if (!(fetchArgs instanceof Function)) {
        requestArgs = [fetchArgs]
        ret.revalidate = () => revalidate(requestArgs)
        revalidate(requestArgs)
    } else {
        ret.revalidate = () => {
            try {
                requestArgs = getRets(fetchArgs)
            } catch (err) {
                resp.data = null
                error.v = err
                return
            }
            revalidate(...requestArgs)
        }
        Effect(() => {
            ret.revalidate()
        })
    }

    // options
    if (!isNaN(options.pollingInterval)) {
        __setInterval(() => {
            revalidate(...requestArgs)
        }, Number(options.pollingInterval))
    }

    return ret

    async function revalidate(...args) {
        const hash = ArrHash(args)

        if (options.dedupe && CONCURRENT_PROMISES[hash]) {
            resp.data = await CONCURRENT_PROMISES[hash]
            return
        }
        try {
            CONCURRENT_PROMISES[hash] = fetcher(...args)
            resp.data = await CONCURRENT_PROMISES[hash]
        } catch (err) {
            error.v = err
            delete CONCURRENT_PROMISES[hash]
            return
        }
        delete CONCURRENT_PROMISES[hash]
        error.v = null
    }
}