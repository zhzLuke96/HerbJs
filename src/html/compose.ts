import { preHTML, VDom, isHTML, ValueMap, _id } from './html';

type Container = HTMLElement | DocumentFragment

const _point = (i: string | null, n: string | null) => `[${n || '$$'}:${i || _id()}]`
const pointRe = /\[(.+?):([\w-]+?)\]/g
const pointRe2 = /\[.+?:([\w-]+?)\]/
const pointReOneline = /^\[(.+?):([\w-]+?)\]$/g

export const compose = (tpl: preHTML) => {
    const {
        vdom,
        vmap
    } = tpl
    const frag = document.createDocumentFragment()
    walkChild(vdom, frag)
    return frag

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
                    if (child.child.length !== 0) {
                        walkChild(child, elem)
                    }
                    for (const attr of child.attrs) {
                        const {
                            key,
                            val
                        } = attr
                        setValFromVmap_Attr(val, key, elem, vmap)
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
    const geted = content.replace(pointRe, (x) => {
        // [TODO] 写了太多string 不太好
        const [type, key] = x.slice(1, -1).split(':')
        const value = vmap.get(key)
        switch (typeof value) {
            case "function":
                // [TODO] 这里应该触发一个依赖回收，Effect
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
    elem.setAttribute(attrName, geted)
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
    context2Elems(content, vmap).forEach(ch => frag.appendChild(ch))

    // 添加到elem的父级容器中
    // [TODO] 应该使用dom utils统一处理dom级别的操作
    container.appendChild(frag)
}

function context2Elems(content: string, vmap: ValueMap) {
    let elems = []
    const text = t => elems.push(document.createTextNode(t))
    const text_id = content.split(pointRe2)
    for (let i = 0; i < text_id.length; i++) {
        const t_i = text_id[i];
        if (i % 2 === 0) {
            if (t_i.length === 0) {
                continue
            }
            text(t_i)
        } else {
            const res = getValFromVmap(t_i, vmap)
            if (isHTML(res)) {
                elems.push(compose(res as preHTML))
            } else {
                text(res)
            }
        }
    }
    console.log(elems)
    return elems
}

// content eg -> [xxx:123123123]
function getValFromVmap(key: string, vmap: ValueMap) {
    // [TODO] 还是应该改一下，还有可能找不到的时候，需要将源文本返回
    const value = vmap.get(key)
    switch (typeof value) {
        case 'function':
            return value()
        case 'undefined':
            return ''
        default:
            return value
    }
}