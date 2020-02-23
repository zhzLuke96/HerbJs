import { preHTML, VDom, isHTML, ValueMap, _id } from './html';
import { effect } from '../reactive/reactivity';
import { isDOM, UniqueId } from '../common';
import { NewFrag } from './frag';

type Container = HTMLElement | DocumentFragment

const _point = (i: string | null, n: string | null) => `[${n || '$$'}:${i || _id()}]`
const pointRe = /\[(.+?):([\w-]+?)\]/g
const pointRe2 = /\[.+?:([\w-]+?)\]/
const pointReOneline = /^\[(.+?):([\w-]+?)\]$/

const subComposeQue: (() => void)[] = []

function runQue() {
    let fn = subComposeQue.pop()
    while (fn) {
        fn()
        fn = subComposeQue.pop()
    }
}

export const compose = (tpl: preHTML) => {
    const {
        vdom,
        vmap
    } = tpl

    return () => {
        const frag = document.createDocumentFragment()
        walkChild(vdom, frag)
        runQue()
        return frag
    }

    function walkChild(vdom: VDom, container: Container) {
        for (const child of vdom.child) {
            let elem = null
            switch (child.type) {
                case 3: // #text
                    setValFromVmap_Text(child.content, container, vmap)
                    // text 的文本会被解析成不同的Node
                    // 并加入到container中，所以直接continue
                    continue
                case 1: // elem
                    elem = document.createElement(child.tag)
                    for (const attr of child.attrs) {
                        const {
                            key,
                            val
                        } = attr
                        setValFromVmap_Attr(val, key, elem, vmap)
                    }
                    if (child.child.length !== 0) {
                        subComposeQue.push(() => {
                            walkChild(child, elem)
                        })
                    }
                    break
                case 7: // comment
                    elem = document.createComment(child.content)
                    break
            }
            container.appendChild(elem)
        }
        return container
    }
}

function getArrByRegFromString(re: RegExp, text: string, mapFn: (t: string) => any = (x) => x): any[] {
    let ret = []
    let match = null
    let lastIndex = 0
    while (match = re.exec(text)) {
        ret.push(text.slice(lastIndex, match.index))
        lastIndex = re.lastIndex

        const matchValue = mapFn(match[0])
        ret.push(matchValue)
    }
    if (lastIndex !== text.length) {
        ret.push(text.slice(lastIndex))
    }
    return ret
}

function setValFromVmap_Attr(content: string, attrName: string, elem: HTMLElement, vmap: ValueMap) {
    if (attrName.startsWith('on')) {
        // bind event
        elem.removeAttribute(attrName)
        if (pointReOneline.test(content)) {
            const fn = vmap.get(RegExp.$2)
            if (typeof fn === 'function') {
                elem.addEventListener(attrName.slice(2), fn)
            }
        }
        return
    }
    effect(() => {
        const contentArr = getArrByRegFromString(pointRe, content, (x) => {
            const [type, key] = x.slice(1, -1).split(':')
            const value = vmap.get(key)
            switch (typeof value) {
                case "function":
                    return value() as string
                case "undefined":
                    return x as string
                case "object":
                    // [TODO] 我们可以获取对象，用来处理复杂的东西
                    // 应该处理一些特殊的attr 比如 style class 之类的都可以接收attr
                    return JSON.stringify(value)
                default:
                    return value as string
            }
        })
        elem.setAttribute(attrName, contentArr.join(''))
    })
}
/**
 * 这个函数会比较复杂，涉及了很多处理，包括我们的组件逻辑
 * 首先和attr一样，我们的所有值都在vmap中拿
 * 这里我们处理的是text的值
 * 但是对于每个不同的元素将会在它的上层容器中创建同级的元素，之后更新不会更新到这里
 * 同时，当获取的值为function时，我们还要判断获取值是什么
 * 如果为我们的tpl类型，也就是组件的情况，这里就递归的调用dumptpl去生成frag元素，并添加到元素后面
 * 更复杂的，之后我们还会支持async函数，以流的形式操作dom
 */
function setValFromVmap_Text(content: string, container: Container, vmap: ValueMap) {
    const frag = document.createDocumentFragment()
    context2Elems(content, vmap, container).forEach((ch) => {
        if (ch === null) {
            return
        }
        if (isDOM(ch)) {
            frag.appendChild(ch)
        } else {
            // is dom function
            frag.appendChild(ch())
        }
    })

    // [TODO] 应该使用dom utils统一处理dom级别的操作

    // 添加到elem的父级容器中
    container.appendChild(frag)
}

function replaceFragChildByDataID(id: string, newChild: DocumentFragment, container: Container) {

    const topContainer = ((c: any) => {
        while (c.lastContainer) {
            c = c.lastContainer
        }
        return c as Container
    })(container)

    const oldChild = Array.from(topContainer.childNodes).filter((node: HTMLElement) => !node.getAttribute ? false : node.getAttribute('data-id') === id)

    Array.from(topContainer.querySelectorAll(`[data-id="${id}"]`))

    Array.from(newChild.childNodes).map((node: HTMLElement) => {
        node.setAttribute && node.setAttribute('data-id', id)
    })


    if (!oldChild[0]) {
        topContainer.appendChild(newChild)
    } else {
        topContainer.insertBefore(newChild, oldChild[0]);
    }

    (newChild as any).lastContainer = container;

    oldChild.forEach((node: HTMLElement) => {
        node.parentNode.removeChild(node)
    })

}

function context2Elems(content: string, vmap: ValueMap, container: Container) {
    return getArrByRegFromString(pointRe, content, (x) => {
        const [type, key] = x.slice(1, -1).split(':')
        const value = vmap.get(key)
        switch (typeof value) {
            case 'undefined':
                // 找不到就返回记号符
                return x
            default:
                return value
        }
    }).map(x => {
        let elem = document.createTextNode('')
        switch (typeof x) {
            case 'undefined':
                break
            case 'string':
                elem.nodeValue = x;
                break
            case 'function':
                let res = x();
                // [TODO] 处理 生成dom 的function
                // 切换 dom 的情况需要patch
                if (isDOM(res)) {
                    return res
                } else if (typeof res === 'function') {

                    // const dataID = UniqueId()
                    // effect(() => {
                    //     const child = res()
                    //     replaceFragChildByDataID(dataID, child, container)
                    // })

                    const frag = NewFrag(container as HTMLElement)

                    subComposeQue.push(() => {
                        effect(() => {
                            frag.replace(res())
                        })
                    })

                    return null
                } else {
                    effect(() => {
                        const res = x();
                        elem.nodeValue = res;
                    })
                }
                break
            case 'object':
                if (isHTML(x)) {
                    return compose(x)
                }
                if (isDOM(x)) {
                    return x
                }
                elem.nodeValue = JSON.stringify(x)
            default:
                elem.nodeValue = x;
        }
        return elem
    })
}


// [TODO] 只能标记带有attr的节点
function getFragDataID(frag: DocumentFragment): [DocumentFragment, string] {
    let dataID = ''

    frag.childNodes.forEach((child: HTMLElement) => {
        if (!child.getAttribute) return
        dataID = child.getAttribute('data-id')
    })

    if (!dataID) {
        dataID = UniqueId()
        frag.childNodes.forEach((child: HTMLElement) => {
            child.setAttribute && child.setAttribute('data-id', dataID)
        })
    }

    return [frag, dataID]
}
