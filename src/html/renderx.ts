import { flatten, getFuncVal, GetValue, isDef, isDOM, isUnDef, UniqueId } from '../common';
import { isState } from '../hox/useState';
import { effect } from '../reactive/reactivity';
import { NewFrag } from './frag';
import { _id, isHTML, preHTML, ValueMap, VDom } from './html';

const pointRe = /\[(.+?):(\w+?)\]/g;
const pointReOneline = /^\[(.+?):(\w+?)\]$/;

export const render = (tpl: preHTML) => {
    const { vdom, vmap } = tpl;

    return () => {
        const { $frag, depFuncs } = renderFrag(vdom, vmap);
        depFuncs.forEach(fn => effect(fn));
        return $frag;
    };
};

const noWord = /^\n+$/;
const createTextNode = (text: any) => {
    const content = text.toString();
    if (noWord.test(content)) {
        return null;
    }
    const str = text.toString().replace(/^[\s\n]+|[\s\n]+$/g, ' ');
    return document.createTextNode(str);
};
const appendTextChild = (container: HTMLElement | DocumentFragment, text: any) => {
    const textNode = createTextNode(text);
    if (!textNode) {
        return;
    }
    container.appendChild(textNode);
};

interface RenderInfo {
    $frag: DocumentFragment;
    depFuncs: Array<() => void>;
}

function renderFrag(vdom: VDom, vmap: ValueMap): RenderInfo {
    const $frag = document.createDocumentFragment();
    let depFuncs = [];

    // 把 vdom 渲染到 frag 中
    // 绑定的事件和回调都操作都在 depFuncs 中
    // 最会会以此注册副作用，通过 effect 函数

    // 这一层的 vdom 就是 frag 容器 不具有任何的属性和渲染过程
    for (const child of vdom.child) {
        if (child.type === 1) {
            const { elem, dFns } = createElem(child, vmap);
            $frag.appendChild(elem);
            depFuncs = depFuncs.concat(dFns);
        }
        if (child.type === 3) {
            const dfns = createFragByText(child.content, vmap, $frag);
            depFuncs = depFuncs.concat(dfns);
        }
    }

    return {
        $frag,
        depFuncs,
    };
}

function createFragByText(
    text: string,
    vmap: ValueMap,
    container: HTMLElement | DocumentFragment,
): Array<() => void> {
    const depFuncs: Array<() => void> = [];

    // 这个函数根据正则表达式将字符串分割成我们需要的
    // point 和 字符串，字符串就是 text 节点
    // point 呢就有多种情况，可能是任何输入的插值
    // 当 point 是函数的话，就要动态的去探测它的返回类型
    // 因此也要求所有的组件是幂等的，否则会有错误
    getArrByRegFromString(pointRe, text, regText => {
        if (regText.length === 0) {
            return;
        }
        const [type, key] = regText.slice(1, -1).split(':');
        const value = vmap.get(key);

        execValue(value, regText);
    });
    return depFuncs;

    function execValue(value, contentText = '') {
        switch (typeof value) {
            case 'undefined':
                appendTextChild(container, contentText);
                return;
            case 'string':
                // 字符串节点
                appendTextChild(container, value);
                return;
            case 'object':
                if (isState(value)) {
                    const stateTextNode = document.createTextNode('');
                    depFuncs.push(() => {
                        stateTextNode.textContent = GetValue(value);
                    });
                    // TODO 如果是组件state的情况
                    return;
                }
                if (value instanceof DocumentFragment) {
                    // 渲染好的组件
                    container.appendChild(value);
                    return;
                }
                if (Array.isArray(value)) {
                    // map 列表
                    value.forEach(val => execValue(val));
                    return;
                }
                return;
            case 'function':
                const test = value();
                if (test instanceof DocumentFragment) {
                    // 可能是渲染好的组件
                    container.appendChild(test);
                    return;
                }
                const funcfrag = NewFrag((container as unknown) as HTMLElement);
                if (Array.isArray(test)) {
                    // map 列表
                    depFuncs.push(() => {
                        // funcfrag.clear()
                        const ns = value()
                            .map(val => {
                                if (typeof val === 'string' || val instanceof String) {
                                    return createTextNode(val);
                                } else if (val instanceof Function) {
                                    const f = val();
                                    if (f instanceof DocumentFragment) {
                                        return f;
                                    }
                                    if (typeof f === 'string' || f instanceof String) {
                                        return createTextNode(f);
                                    }
                                }
                            })
                            .filter(x => x);
                        funcfrag.replace(ns);
                    });
                    return;
                }
                // 函数返回值可能是各种，所以这里比较复杂
                const textNode = document.createTextNode('');
                let lastResult: any = null;
                depFuncs.push(() => {
                    const newResult = value();
                    if (newResult === lastResult) {
                        return;
                    }
                    if (typeof newResult !== 'function') {
                        if (!funcfrag.has((textNode as unknown) as HTMLElement)) {
                            funcfrag.replace((textNode as unknown) as DocumentFragment);
                        }
                        if (textNode.nodeValue === newResult + '') {
                            return;
                        }
                        textNode.nodeValue = value() as string;
                        return;
                    }

                    const fragNode = ((newResult as unknown) as () => any)();
                    if (fragNode instanceof DocumentFragment) {
                        funcfrag.replace(fragNode);
                    } else {
                        if (!funcfrag.has((textNode as unknown) as HTMLElement)) {
                            funcfrag.replace((textNode as unknown) as DocumentFragment);
                        }
                        if (textNode.nodeValue !== fragNode + '') {
                            textNode.nodeValue = fragNode + '';
                        }
                    }
                    lastResult = newResult;
                });
                return;
        }
    }
}

function createSVGElem(vdom: VDom, vmap: ValueMap) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', vdom.tag);
    let depFuncs: Array<() => void> = [];

    vdom.child.forEach(vd => {
        if (vd.type === 3) {
            return;
        }
        const { elem, dFns } = createSVGElem(vd, vmap);
        depFuncs = depFuncs.concat(dFns);
        svg.appendChild(elem);
    });

    for (const attr of vdom.attrs) {
        const { key, val } = attr;
        svg.setAttribute(key, val);
    }

    return { elem: svg, dFns: depFuncs };
}

function createElem(vdom: VDom, vmap: ValueMap) {
    if (vdom.tag.toLowerCase() === 'svg') {
        return createSVGElem(vdom, vmap);
    }

    const elem = document.createElement(vdom.tag);
    let depFuncs: Array<() => void> = [];

    vdom.child.forEach(vd => {
        if (vd.type === 3) {
            // text
            const dfns = createFragByText(vd.content, vmap, elem);
            depFuncs = depFuncs.concat(dfns);
            return;
        }
        const { elem: $, dFns } = createElem(vd, vmap);
        elem.appendChild($);
        depFuncs = depFuncs.concat(dFns);
    });

    for (const attr of vdom.attrs) {
        const { key, val } = attr;
        setElemAttr(elem, key, val, vmap, depFuncs);
    }
    return { elem, dFns: depFuncs };
}

function setElemAttr(
    elem: HTMLElement,
    key: string,
    val: any,
    vmap: ValueMap,
    depFuncs: Array<() => void>,
) {
    if (key.startsWith('on')) {
        // event
        const eventName = key.slice(2).toLowerCase();
        // elem.removeAttribute(key)
        if (typeof val === 'function') {
            elem.addEventListener(eventName, val);
            return;
        }
        if (typeof val !== 'string') {
            return;
        }
        if (pointReOneline.test(val)) {
            const fn = vmap.get(RegExp.$2);
            if (typeof fn === 'function') {
                elem.addEventListener(eventName, fn);
            }
        }
        return;
    }

    // attr
    // 只支持属性被赋值为插值的情况，不支持把插值和字符串混合起来用
    if (typeof val !== 'string' || !pointReOneline.test(val)) {
        // ref
        if (key === 'ref') {
            setElemRef(elem, val);
            return;
        }
        if (typeof val === 'function') {
            depFuncs.push(() => {
                attrSetter(elem, key, getFuncVal(val));
            });
            return;
        }
        if (isState(val)) {
            depFuncs.push(() => {
                attrSetter(elem, key, GetValue(val));
            });
            return;
        }
        attrSetter(elem, key, val);
        return;
    }
    // 有 point
    const value = vmap.get(RegExp.$2);

    if (key === 'ref') {
        setElemRef(elem, value);
        return;
    }

    switch (typeof value) {
        case 'undefined':
            break;
        case 'function':
            depFuncs.push(() => {
                const newValue = getFuncVal(value) as string;
                attrSetter(elem, key, newValue);
            });
            break;
        case 'object':
            if (isState(value)) {
                depFuncs.push(() => {
                    attrSetter(elem, key, GetValue(value));
                });
                break;
            }
            if (key === RegExp.$2) {
                for (const k in value) {
                    if (value.hasOwnProperty(k)) {
                        const v = value[k];
                        setElemAttr(elem, k, v, vmap, depFuncs);
                    }
                }
                break;
            }
        // 这里稍微拦截以下，其实也可以放到attrsetter，就是有点不太好
        default:
            attrSetter(elem, key, value);
            break;
    }
}

function setElemRef(elem, refs: any) {
    if (typeof refs === 'function') {
        refs(elem);
        return;
    }
    if (Array.isArray(refs)) {
        flatten(refs)
            .filter(x => typeof x === 'function')
            .forEach(ref => ref(elem));
        return;
    }
}

function attrSetter(elem: HTMLElement, key: string, val: any) {
    if (val === undefined) {
        return;
    }
    if (val === null) {
        elem.removeAttribute(key);
        return;
    }

    // 设置video默认静音
    if (key === 'muted' && elem.localName === 'video') {
        (elem as any).muted = true;
        return;
    }
    if (key === 'checked' && elem.localName === 'input') {
        (elem as any).checked = !!val;
        return;
    }
    if (typeof val === 'boolean') {
        if (val) {
            elem.setAttribute(key, '');
        } else {
            elem.removeAttribute(key);
        }
        return;
    }

    if (typeof val === 'object') {
        if (key === 'style') {
            for (const csskey in val) {
                if (val.hasOwnProperty(csskey)) {
                    const cssval = val[csskey];
                    elem.style[csskey] = cssval;
                }
            }
        } else {
            // 暂时只有style支持object的用法
        }
        return;
    }

    if (key === 'class' || key === 'className') {
        if (elem.classList) {
            const oldCls = (elem as any)._oldCls;
            const newCls = val.split(' ');
            newCls.filter(t => !!t.trim()).forEach(cls => elem.classList.add(cls));
            if (oldCls) {
                oldCls
                    .filter(cls => !newCls.includes(cls))
                    .filter(t => !!t.trim())
                    .forEach(cls => elem.classList.remove(cls));
            }
            (elem as any)._oldCls = newCls;
        }
        return;
    }

    if (key === 'style') {
        elem.style.cssText = val;
        return;
    }
    elem.setAttribute(key, val);
}

function getArrByRegFromString(
    re: RegExp,
    text: string,
    mapFn: (t: string) => any = x => x,
): any[] {
    const ret = [];
    let match = null;
    let lastIndex = 0;
    // tslint:disable-next-line
    while ((match = re.exec(text))) {
        const mval = text.slice(lastIndex, match.index);
        ret.push(mval);
        lastIndex = re.lastIndex;

        const matchValue = match[0];
        ret.push(matchValue);
    }
    if (lastIndex !== text.length) {
        const matchValue = text.slice(lastIndex);
        ret.push(matchValue);
    }
    return ret.map(mapFn);
}
