import { UniqueId, isDef, isUnDef } from "../common"
import { Container } from "../vdom/container";
import { patchChildren, childType } from "../vdom/vdom";
import { Dom2Vnode } from "../vdom/any2v";


interface RenderFrag {
    __id: string
    replace: (frag: DocumentFragment) => void
    clear: () => void
    hide: () => void
    isEmpty: () => boolean
    nodes: () => HTMLElement[]
    node: (idx: number) => HTMLElement
    append: (elem: HTMLElement) => void
    has: (elem: HTMLElement) => boolean
    currentContainer: () => Node | ParentNode
    removeChild: (elem: HTMLElement) => void
    replaceChild: (newChild: Node, oldChild: Node) => void
    insertBefore: (newChild: Node, refChild: Node) => void
}


class VFragContainer implements Container {
    fragKit: RenderFrag
    constructor(frag: RenderFrag) {
        this.fragKit = frag
    }
    get firstChild(): Node {
        return this.fragKit.node(0);
    }
    get childNodes(): Node[] {
        return this.fragKit.nodes()
    }
    public replaceChild(newChild: Node, oldChild: Node): Node {
        (this.fragKit.currentContainer() as Node).replaceChild(newChild, oldChild);
        this.fragKit.replaceChild(newChild, oldChild);
        return newChild;
    }
    public insertBefore(newChild: Node, refChild: Node): Node {
        (this.fragKit.currentContainer() as Node).replaceChild(newChild, refChild);
        this.fragKit.insertBefore(newChild, refChild);
        return newChild;
    }
    public insertAfter(newChild: Node, refChild: Node): Node {
        if (refChild.nextSibling) {
            return this.insertBefore(newChild, refChild.nextSibling);
        } else {
            return this.appendChild(newChild);
        }
    }
    public appendChild(newChild: Node): Node {
        this.fragKit.append(newChild as unknown as HTMLElement);
        return newChild;
    }
    public removeChild(oldChild: Node): Node {
        this.fragKit.removeChild(oldChild as HTMLElement)
        return (this.fragKit.currentContainer() as Node).removeChild(oldChild);
    }
}

function insertAfter<T extends Node>(container: T, newElem, refElem: T) {
    if (isUnDef(container)) {
        return
    }
    // 这里要是写nextSibling效果会非常迷，可能是浏览器的bug，空的text node的位置会被偏移到他前面的elem上...
    const afterElem = (refElem as any).nextElementSibling
    if (afterElem) {
        container.insertBefore(newElem, refElem)
    } else {
        container.appendChild(newElem)
    }
}

export function NewFrag(_container: HTMLElement, refElem?: HTMLElement): RenderFrag {
    const id = UniqueId()
    const anchor = document.createComment(id)
    let children: HTMLElement[] = []

    if (refElem) {
        insertAfter(_container, anchor, refElem)
    } else {
        _container.appendChild(anchor)
    }

    const currentContainer = () => {
        if (isEmpty()) {
            return anchor.parentNode
        }
        return children.reduce((c, x) => c || x.parentNode, null)
    }
    const isEmpty = () => children.length === 0
    const has = (elem: HTMLElement): boolean => children.length === 0 ? false : !!children.find(child => child === elem)
    const append = (elem: HTMLElement) => {
        if (isEmpty()) {
            if (elem instanceof DocumentFragment) {
                children = children.concat(Array.from(elem.childNodes) as HTMLElement[])
            } else {
                children.push(elem)
            }
            anchor.parentNode.insertBefore(elem, anchor)
            anchor.parentNode.removeChild(anchor)
        } else {
            const lastChild = children[children.length - 1]
            if (elem instanceof DocumentFragment) {
                children = children.concat(Array.from(elem.childNodes) as HTMLElement[])
            } else {
                children.push(elem)
            }
            // lastChild.parentNode.insertBefore(elem, lastChild)
            insertAfter(lastChild.parentNode, elem, lastChild)
        }
    }
    const replace = (frag) => {
        const nxtChild = Array.from(frag.childNodes)

        if (nxtChild.length === 0) {
            const container = children[0].parentElement
            if (children.length !== 0) {
                children[0].parentNode.insertBefore(anchor, children[0])
                children.forEach(ch => container.removeChild(ch))
            }
        }
        // else if (nxtChild.length === 1) {
        //     if (!isEmpty()) {
        //         const container = children[0].parentElement
        //         children.forEach(ch => container.removeChild(ch))
        //     }
        //     anchor.parentNode.insertBefore(frag, anchor)
        //     anchor.parentNode.removeChild(anchor)
        // } else {
        //     const prev = children.map(ch => Dom2Vnode(ch))
        //     const next = nxtChild.map(ch => Dom2Vnode(ch))
        //     patchChildren(childType.MULITPLE, childType.MULITPLE, prev, next, new VFragContainer(kit))
        // }
        else {
            if (!isEmpty()) {
                const container = children[0].parentElement
                children.forEach(ch => container.removeChild(ch))
            }
            anchor.parentNode.insertBefore(frag, anchor)
            anchor.parentNode.removeChild(anchor)
        }
        children = nxtChild as HTMLElement[]
    }
    const clear = () => {
        if (isEmpty()) {
            return
        }
        const container = currentContainer()
        for (const ch of children) {
            try {
                container.insertBefore(anchor, ch)
            } catch (error) {
                continue
            }
            break
        }
        children.forEach(ch => ch.parentNode && container.removeChild(ch))
        children = []
    }

    const kit = {
        __id: id,
        has,
        replace,
        clear,
        append,
        hide() {
            children.forEach((ch) => {
                if (ch.style) {
                    ch.style.display = 'none'
                }
            })
        },
        isEmpty,
        nodes() {
            return children
        },
        node(idx: number) {
            return children[idx]
        },
        currentContainer,
        removeChild(elem) {
            children = children.filter(child => child !== elem)
        },
        replaceChild(newChild: Node, oldChild: Node) {
            const idx = children.findIndex(child => child === oldChild)
            children.splice(idx, 1, newChild as HTMLElement)
        },
        insertBefore(newChild: Node, refChild: Node) {
            const idx = children.findIndex(child => child === refChild)
            children.splice(idx, 1, newChild as HTMLElement, refChild as HTMLElement)
        }
    }

    return kit
}


