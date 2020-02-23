import { preHTML, VDom, isHTML, ValueMap, _id } from './html';
import { effect } from '../reactive/reactivity';
import { isDOM, UniqueId } from '../common';
import { NewFrag } from './frag';
import { nextTickWithKey } from '../reactive/nxtTick';

type Container = HTMLElement | DocumentFragment

const _point = (i: string | null, n: string | null) => `[${n || '$$'}:${i || _id()}]`
const pointRe = /\[(.+?):([\w-]+?)\]/g
const pointRe2 = /\[.+?:([\w-]+?)\]/
const pointReOneline = /^\[(.+?):([\w-]+?)\]$/

export const render = (tpl: preHTML) => {
    const {
        vdom,
        vmap
    } = tpl

    return () => {
        const { $frag, depFuncs } = renderFrag(vdom, vmap)
        depFuncs.forEach(fn => effect(fn))
        return $frag
    }
}

const createTextNode = (text: string) => {
    text = text.replace(/^[\s\n]+|[\s\n]+$/g, ' ')
    return document.createTextNode(text)
}

interface renderInfo {
    $frag: DocumentFragment
    depFuncs: (() => void)[]
}

function renderFrag(vdom: VDom, vmap: ValueMap): renderInfo {
    const $frag = document.createDocumentFragment()
    let depFuncs = []

    for (const child of vdom.child) {
        switch (child.type) {
            case 1: //elem
                const { elem, dFns } = createElem(child, vmap)
                $frag.appendChild(elem)
                depFuncs = depFuncs.concat(dFns)
                break
            case 3: // text
                const dfns = createFragByText(child.content, vmap, $frag)
                depFuncs = depFuncs.concat(dfns)
                break
        }
    }

    return {
        $frag,
        depFuncs
    }
}


function createFragByText(text: string, vmap: ValueMap, container: HTMLElement | DocumentFragment): (() => void)[] {
    let depFuncs: (() => void)[] = []
    getArrByRegFromString(pointRe, text, text => {
        if (text.length === 0) {
            return
        }
        const [type, key] = text.slice(1, -1).split(':')
        const value = vmap.get(key)
        switch (typeof value) {
            case 'undefined':
                container.appendChild(createTextNode(text))
                return
            case 'string':
                container.appendChild(createTextNode(value))
                return
            case 'object':
                // if (isHTML(value)) {
                //     const subFrag = renderFrag(value, vmap)
                //     container.appendChild(subFrag.$frag);
                //     depFuncs = depFuncs.concat(subFrag.depFuncs)
                //     return
                // }
                // if (isDOM(value)) {
                //     container.appendChild(value)
                //     return
                // }
                // const objStr = JSON.stringify(value)
                // container.appendChild(createTextNode(objStr))
                return
            case 'function':
                let testValue = value()
                if (isDOM(testValue)) {
                    container.appendChild(testValue as DocumentFragment)
                } else if (typeof testValue === 'function') {
                    const frag = NewFrag(container as unknown as HTMLElement)
                    let lastDomGen: any = null
                    depFuncs.push(() => {
                        const newDomGen = value()
                        if (newDomGen === lastDomGen) {
                            return
                        }
                        frag.replace((newDomGen as unknown as () => any)() as DocumentFragment)
                        lastDomGen = newDomGen
                    })
                    frag.replace((testValue as unknown as () => any)() as DocumentFragment)
                } else {
                    const textElem = createTextNode('')
                    container.appendChild(textElem)
                    depFuncs.push(() => {
                        textElem.nodeValue = value() as string
                    })
                }
                return
        }
    })
    return depFuncs
}


function createElem(vdom: VDom, vmap: ValueMap) {
    const elem = document.createElement(vdom.tag)
    let depFuncs: (() => void)[] = []

    vdom.child.forEach(vd => {
        if (vd.type === 3) {
            // text
            // const dfns = createFragByText(vd.content, vmap, elem)
            // depFuncs = depFuncs.concat(dfns)
            return
        }
        // const { elem: $, dFns } = createElem(vd, vmap)
        // elem.appendChild($)
        // depFuncs = depFuncs.concat(dFns)
    })

    for (const attr of vdom.attrs) {
        const {
            key,
            val
        } = attr
        if (key.startsWith('on')) {
            // event
            const eventName = key.slice(2)
            // elem.removeAttribute(key)
            if (pointReOneline.test(val)) {
                const fn = vmap.get(RegExp.$2)
                if (typeof fn === 'function') {
                    elem.addEventListener(eventName, fn)
                }
            }
        } else {
            // attr
            // 只支持属性被赋值为插值的情况，不支持把插值和字符串混合起来用
            if (!pointReOneline.test(val)) {
                elem.setAttribute(key, val)
            } else {
                const value = vmap.get(RegExp.$2)
                switch (typeof value) {
                    case "function":
                        depFuncs.push(() => {
                            const val = value() as string
                            elem.setAttribute(key, val)
                        })
                        break;
                    case "undefined":
                        break;
                    case "object":
                        // [TODO] 我们可以获取对象，用来处理复杂的东西
                        // 应该处理一些特殊的attr 比如 style class 之类的都可以接收attr
                        if (key === 'style') {
                            // depFuncs.push(() => {
                            //     for (const cssName in value) {
                            //         if (value.hasOwnProperty(cssName)) {
                            //             const styleValue = value[cssName]
                            //             if (elem.style[cssName] === styleValue) {
                            //                 break;
                            //             }
                            //             elem.style[cssName] = styleValue
                            //         }
                            //     }
                            // })
                        }
                        if (key === 'class') {
                            // class
                        }
                        break
                    default:
                    // todo
                }
            }
        }
    }
    return { elem, dFns: depFuncs }
}





function getArrByRegFromString(re: RegExp, text: string, mapFn: (t: string) => any = (x) => x): any[] {
    let ret = []
    let match = null
    let lastIndex = 0
    while (match = re.exec(text)) {
        const mval = mapFn(text.slice(lastIndex, match.index))
        ret.push(mval)
        lastIndex = re.lastIndex

        const matchValue = mapFn(match[0])
        ret.push(matchValue)
    }
    if (lastIndex !== text.length) {
        const matchValue = mapFn(text.slice(lastIndex))
        ret.push(matchValue)
    }
    return ret
}
