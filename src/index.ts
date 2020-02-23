// export { compose } from './html/compose';
// export { render } from './html/render';
export { html as _html } from './html/html';
export { reactive, effect as Effect } from './reactive/reactivity';
export { useState, useRequest, useBoolean, useHover, useEventListener, useSize, useVisible, useMotion, useStyle, useWindowSize, useResponsive } from './hox/index'
export { Card, Button, Button as Btn, Row, Col, Input, Icon } from './ui/index';

import { html as _html } from './html/html';
import { compose } from './html/compose';
import { render } from './html/renderx';


const htmlCache = new Map<string, () => DocumentFragment>()

const tplHash = (strings: string[], ...values: any[]): string => {
    let ret = strings[0]
    for (let i = 1; i < strings.length; i++) {
        const str = strings[i];
        const valStr = values[i - 1]
        ret += valStr + str
    }
    return ret
}

export const html = (strings: TemplateStringsArray, ...values: any[]) => {
    // const hash = tplHash(strings, ...values)
    // if (htmlCache.has(hash)) {
    //     return htmlCache.get(hash)
    // } else {
    //     const gen = render(_html(strings, ...values))
    //     htmlCache.set(hash, gen)
    //     return gen
    // }
    return render(_html(Array.from(strings), ...values))
}



