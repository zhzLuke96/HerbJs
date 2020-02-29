type Container = Element | DocumentFragment;

enum nodeType {
    ELEMENT,
    TEXT,
    COMMENT,
    FRAGMENT,
    ATTRIBUTE,
}

const isNodeType = (node: Element) => {
    switch (node.nodeType) {
        case 1:
            return nodeType.ELEMENT;
        case 2:
            return nodeType.ATTRIBUTE;
        case 3:
            return nodeType.TEXT;
        case 8:
            return nodeType.COMMENT;
        case 11:
            return nodeType.FRAGMENT;
        default:
            return nodeType.ELEMENT;
    }
};

export const patch = (prev: Element, next: Element, container: Container) => {
    const nextType = isNodeType(next);
    const prevType = isNodeType(prev);

    (prev as any).$ = (next as any).$ = prev;

    if (nextType !== prevType) {
        container.replaceChild(prev, next);
        return;
    }
    switch (nextType) {
        case nodeType.ELEMENT: {
            patchElement(prev, next);
            break;
        }
        case nodeType.TEXT: {
            prev.textContent = next.textContent;
            break;
        }
        case nodeType.COMMENT: {
            // nothing to do
            break;
        }
        case nodeType.FRAGMENT: {
            // nothing to do
            break;
        }
        case nodeType.ATTRIBUTE: {
            // nothing to do
            break;
        }
        default: {
            // ERROR
            throw new Error('wrong patch call');
        }
    }
};

const patchElement = (prev: Element, next: Element) => {
    const prevAttrs: { [key: string]: Attr } = Array.from(prev.attributes).reduce(
        (a, v) => (a[v.name] = v) && a,
        {},
    );
    const nextAttrs: { [key: string]: Attr } = Array.from(next.attributes).reduce(
        (a, v) => (a[v.name] = v) && a,
        {},
    );
    for (const key in nextAttrs) {
        if (nextAttrs.hasOwnProperty(key)) {
            const prevVal = prevAttrs[key];
            const nextVal = nextAttrs[key];
            if ((nextVal && !prevVal) || prevVal.value !== nextVal.value) {
                prev.setAttribute(key, nextVal.value);
            }
        }
    }
    for (const key in prevAttrs) {
        if (prevAttrs.hasOwnProperty(key)) {
            if (!nextAttrs.hasOwnProperty(key)) {
                prev.removeAttribute(key);
            }
        }
    }
    patchChildren(
        Array.from(prev.childNodes) as Element[],
        Array.from(next.childNodes) as Element[],
        prev,
    );
};

export const patchChildren = (
    prevChildren: Element[],
    nextChildren: Element[],
    container: Container,
) => {
    const prevChildrenLength = prevChildren.length;
    const nextChildrenLength = nextChildren.length;

    switch (prevChildrenLength) {
        case 1: {
            switch (nextChildrenLength) {
                case 1: {
                    patch(prevChildren[0], nextChildren[0], container);
                    break;
                }
                case 0: {
                    container.removeChild(prevChildren[0]);
                    break;
                }
                default: {
                    container.removeChild(prevChildren[0]);
                    for (const idx in nextChildren) {
                        if (nextChildren.hasOwnProperty(idx)) {
                            const child = nextChildren[idx];
                            mount(child, container, null, MountPostion.AFTER);
                        }
                    }
                    break;
                }
            }
            break;
        }
        case 0: {
            switch (nextChildrenLength) {
                case 1: {
                    mount(nextChildren[0], container, null, MountPostion.AFTER);
                    break;
                }
                case 0: {
                    break;
                }
                default: {
                    for (const idx in nextChildren) {
                        if (nextChildren.hasOwnProperty(idx)) {
                            const child = nextChildren[idx];
                            mount(
                                child,
                                container,
                                nextChildren[Number(idx) - 1],
                                MountPostion.AFTER,
                            );
                        }
                    }
                    break;
                }
            }
            break;
        }
        default: {
            switch (nextChildrenLength) {
                case 1: {
                    for (const child of prevChildren) {
                        container.removeChild(child);
                    }
                    mount(nextChildren[0], container, null, MountPostion.AFTER);
                    break;
                }
                case 0: {
                    for (const child of prevChildren) {
                        container.removeChild(child);
                    }
                    break;
                }
                default: {
                    diffPatch(prevChildren, nextChildren, container as Element);
                    break;
                }
            }
            break;
        }
    }
};

// const sameNode = (a: Element, b: Element) => a.isEqualNode(b)
const sameNode = (a: Element, b: Element) => a.constructor === b.constructor;

const diffPatch = (prevChildren: Element[], nextChildren: Element[], container: Element) => {
    let oldStartIdx = 0;
    let newStartIdx = 0;
    let oldEndIdx = prevChildren.length - 1;
    let oldStartNode = prevChildren[0];
    let oldEndNode = prevChildren[oldEndIdx];
    let newEndIdx = nextChildren.length - 1;
    let newStartNode = nextChildren[0];
    let newEndNode = nextChildren[newEndIdx];

    const patchMap = new Map<Element, Element>();

    const patchedNodes = new WeakSet();
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        if (patchedNodes.has(oldStartNode)) {
            oldStartNode = prevChildren[++oldStartIdx];
        } else if (patchedNodes.has(oldStartNode)) {
            oldEndNode = prevChildren[--oldEndIdx];
        } else if (sameNode(oldStartNode, newStartNode)) {
            patch(oldStartNode, newStartNode, container);
            patchMap.set(newStartNode, oldStartNode);
            oldStartNode = prevChildren[++oldStartIdx];
            newStartNode = nextChildren[++newStartIdx];
        } else if (sameNode(oldEndNode, newEndNode)) {
            patch(oldEndNode, newEndNode, container);
            patchMap.set(newEndNode, oldEndNode);
            oldEndNode = prevChildren[--oldEndIdx];
            newEndNode = nextChildren[--newEndIdx];
        } else if (sameNode(oldStartNode, newEndNode)) {
            // node moved right
            patch(oldStartNode, newEndNode, container);
            patchMap.set(newEndNode, oldStartNode);
            if (prevChildren[oldEndIdx].nextSibling) {
                container.insertBefore(oldStartNode, prevChildren[oldEndIdx].nextSibling);
            } else {
                container.appendChild(oldStartNode);
            }
            oldStartNode = prevChildren[++oldStartIdx];
            newEndNode = nextChildren[--newEndIdx];
        } else if (sameNode(oldEndNode, newStartNode)) {
            // node moved left
            patch(oldEndNode, newStartNode, container);
            patchMap.set(newStartNode, oldEndNode);
            container.insertBefore(oldEndNode, oldStartNode);
            oldEndNode = prevChildren[--oldEndIdx];
            newStartNode = nextChildren[++newStartIdx];
        } else {
            let find = false;
            for (let j = oldStartIdx; j <= oldEndIdx; j++) {
                const prevNode = prevChildren[j];
                if (sameNode(prevNode, newStartNode) && !patchedNodes.has(prevNode)) {
                    find = true;
                    patch(prevNode, newStartNode, container);
                    patchMap.set(newStartNode, prevNode);
                    patchedNodes.add(prevNode);
                    break;
                }
            }
            if (!find) {
                if (patchMap.has(nextChildren[newStartIdx - 1])) {
                    mount(
                        newStartNode,
                        container,
                        patchMap.get(nextChildren[newStartIdx - 1]),
                        MountPostion.AFTER,
                    );
                } else {
                    mount(newStartNode, container, oldStartNode, MountPostion.BEFORE);
                }
            }
            newStartNode = nextChildren[++newStartIdx];
        }
    }
    if (oldStartIdx > oldEndIdx) {
        if (nextChildren[newStartIdx - 1]) {
            nextChildren
                .slice(newStartIdx, newEndIdx + 1)
                .reverse()
                .map(node => {
                    mount(node, container, nextChildren[newStartIdx - 1], MountPostion.AFTER);
                });
        } else {
            nextChildren.slice(newStartIdx, newEndIdx + 1).map(node => {
                mount(node, container, null, MountPostion.BEFORE);
            });
        }
    } else if (newStartIdx > newEndIdx) {
        prevChildren
            .slice(oldStartIdx, oldEndIdx + 1)
            .filter(child => !patchedNodes.has(child))
            .map(node => {
                container.removeChild(node);
            });
    }
};

enum MountPostion {
    BEFORE,
    AFTER,
}

const insertAfter = (node: Element, refNode: Element, container: Container) => {
    if (refNode && refNode.nextSibling) {
        container.insertBefore(node, refNode.nextSibling);
    } else {
        container.appendChild(node);
    }
};

const mount = (node: Element, container: Container, refNode: Element, position: MountPostion) => {
    if (position === MountPostion.BEFORE) {
        container.insertBefore(node, refNode);
    } else {
        insertAfter(node, refNode, container);
    }
};
