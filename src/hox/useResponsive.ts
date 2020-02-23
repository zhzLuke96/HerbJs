import { useWindowSize } from './useWindowSize';
import { useState } from './useState';
import { reactive, effect as Effect } from '../reactive/reactivity';
import { isDef, isUnDef, isDefAll } from '../common';

interface SizeType {
    w?: number
    h?: number
}

interface ResponsiveOptions {
    [key: string]: SizeType
}

const sizeInclude = (a: SizeType, b: SizeType) => {
    if (isDefAll(a.w, a.h, b.w, b.h)) {
        return a.w - b.w + a.h - b.h
    }
    if (isDefAll(a.w, b.w)) {
        return a.w - b.w
    }
    if (isDefAll(a.h, b.h)) {
        return a.h - b.h
    }
    return 0
}

export const useResponsive = (opt: ResponsiveOptions) => {
    const currentMode = useState('null')
    const { Size } = useWindowSize()
    const sizeArr = Object.keys(opt)
        .map(name => ({ name, ...opt[name] }))
        .sort((a, b) => -sizeInclude({ w: a.w, h: a.h }, { w: b.w, h: b.h }))

    Effect(() => {
        if (sizeArr.length === 0) {
            return
        }
        let mode = sizeArr[0].name
        for (const size of sizeArr) {
            const { name, w, h } = size
            if (sizeInclude({ w, h }, Size) >= 0) {
                mode = name
            } else {
                break
            }
        }
        currentMode.v = mode
    })
    return { currentMode }
}
