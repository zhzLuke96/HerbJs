import { flatten, isDef, isUnDef, UniqueId } from '../common';
import { patch, patchChildren } from '../diff/index';

interface RenderFrag {
    __id: string;
    replace: (frag: DocumentFragment) => void;
    isEmpty: () => boolean;
    nodes: () => HTMLElement[];
    node: (idx: number) => HTMLElement;
    append: (elem: HTMLElement) => void;
    has: (elem: HTMLElement) => boolean;
    currentContainer: () => Node | ParentNode;
    removeChild: (elem: HTMLElement) => void;
    replaceChild: (newChild: Node, oldChild: Node) => void;
    insertBefore: (newChild: Node, refChild: Node) => void;
}

class VFragContainer {
    public fragKit: RenderFrag;
    constructor(frag: RenderFrag) {
        this.fragKit = frag;
    }
    get firstChild(): Node {
        return this.fragKit.node(0);
    }
    get childNodes(): Node[] {
        return this.fragKit.nodes();
    }
    public replaceChild(newChild: Node, oldChild: Node): Node {
        (this.fragKit.currentContainer() as Node).replaceChild(newChild, oldChild);
        this.fragKit.replaceChild(newChild, oldChild);
        return newChild;
    }
    public insertBefore(newChild: Node, refChild: Node): Node {
        (this.fragKit.currentContainer() as Node).insertBefore(newChild, refChild);
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
        this.fragKit.append((newChild as unknown) as HTMLElement);
        return newChild;
    }
    public removeChild(oldChild: Node): Node {
        this.fragKit.removeChild(oldChild as HTMLElement);
        try {
            return (this.fragKit.currentContainer() as Node).removeChild(oldChild);
        } catch (error) {
            return oldChild;
        }
    }
}

function insertAfter<T extends Node>(container: T, newElem, refElem: T) {
    if (isUnDef(container)) {
        return;
    }
    const afterElem = refElem.nextSibling;
    if (afterElem) {
        container.insertBefore(newElem, refElem);
    } else {
        container.appendChild(newElem);
    }
}

export function NewFrag(superContainer: HTMLElement, refElem?: HTMLElement): RenderFrag {
    const id = UniqueId();
    const anchor = document.createComment(id);
    let children: HTMLElement[] = [];

    let superRefChild: HTMLElement = null;

    if (refElem) {
        insertAfter(superContainer, anchor, refElem);
    } else {
        superContainer.appendChild(anchor);
    }

    const currentContainer = () => {
        if (isEmpty()) {
            return anchor.parentNode || superContainer;
        }
        return children.reduce((c, x) => c || x.parentNode, null);
    };
    const isEmpty = () => children.length === 0;
    const has = (elem: HTMLElement): boolean =>
        children.length === 0 ? false : !!children.find(child => child === elem);
    const append = (elem: HTMLElement) => {
        if (anchor.parentElement && anchor.parentElement !== superContainer) {
            superContainer = anchor.parentElement;
        }
        if (children.length !== 0 && anchor.parentElement) {
            anchor.parentElement.removeChild(anchor);
        }
        if (isEmpty()) {
            if (anchor.parentNode) {
                anchor.parentNode.insertBefore(elem, anchor);
                anchor.parentNode.removeChild(anchor);
            } else {
                // 由于patch函数删除可能会导致元素丢失
                const con = currentContainer();
                if (superRefChild && superRefChild.parentElement === con) {
                    con.insertBefore(elem, superRefChild);
                    superRefChild = null;
                } else {
                    con.appendChild(elem);
                }
            }
            if (elem instanceof DocumentFragment) {
                children = children.concat(Array.from(elem.childNodes) as HTMLElement[]);
            } else {
                children.push(elem);
            }
        } else {
            const lastChild = children[children.length - 1];
            if (elem instanceof DocumentFragment) {
                children = children.concat(Array.from(elem.childNodes) as HTMLElement[]);
            } else {
                children.push(elem);
            }
            insertAfter(lastChild.parentNode, elem, lastChild);
        }
    };
    const replace = (frag: DocumentFragment) => {
        if (anchor.parentElement && anchor.parentElement !== superContainer) {
            superContainer = anchor.parentElement;
        }
        if (children.length !== 0 && anchor.parentElement) {
            superContainer = anchor.parentElement;
            anchor.parentElement.removeChild(anchor);
            superRefChild = (anchor as any) as HTMLElement;
        }
        let nxtChild = (() => {
            if (Array.isArray(frag)) {
                return frag;
            }
            return [frag];
        })();
        nxtChild = (flatten(nxtChild) as any[]).map(f => {
            if (f instanceof DocumentFragment) {
                return Array.from(f.childNodes);
            }
            return f;
        });
        nxtChild = flatten(nxtChild);

        if (nxtChild.length === 0 && children.length !== 0) {
            children[0].parentNode.insertBefore(anchor, children[0]);
        }

        if (nxtChild.length !== 0 && children.length === 0) {
            superContainer = anchor.parentElement;
            // anchor.parentElement && anchor.parentElement.removeChild(anchor)
            superRefChild = (anchor as any) as HTMLElement;
        }

        superContainer = currentContainer() as HTMLElement;
        if (children.length !== 0) {
            superRefChild = children[children.length - 1].nextElementSibling as HTMLElement;
        }

        patchChildren(
            [...children],
            [...nxtChild] as Element[],
            (new VFragContainer(kit) as any) as Element,
        );
        if (children.length !== 0 && anchor.parentElement) {
            anchor.parentElement.removeChild(anchor);
        }

        children = children.filter(c => c);
    };

    const kit = {
        __id: id,
        has,
        replace,
        append,
        isEmpty,
        nodes() {
            return children;
        },
        node(idx: number) {
            return children[idx];
        },
        currentContainer,
        removeChild(elem) {
            const next = children.filter(child => child !== elem);
            if (next.length === 0) {
                children[0].parentElement.insertBefore(anchor, children[0]);
            }
            children = next;
        },
        replaceChild(newChild: Node, oldChild: Node) {
            const newidx = children.findIndex(child => child === newChild);
            const oldidx = children.findIndex(child => child === oldChild);
            children.splice(oldidx, 1, newChild as HTMLElement);
            children.splice(newidx, 1, oldChild as HTMLElement);
        },
        insertBefore(newChild: Node, refChild?: Node) {
            if (!refChild) {
                children.push(newChild as HTMLElement);
                return;
            }
            const idx = children.findIndex(child => child === refChild);
            if (idx === -1) {
                children.push(newChild as HTMLElement);
                return;
            }
            children.splice(idx, 1, newChild as HTMLElement, refChild as HTMLElement);
        },
    };

    return kit;
}
