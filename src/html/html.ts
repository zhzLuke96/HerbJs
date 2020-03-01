import { isDOM } from '../common';

interface VAttr {
    key: string;
    val: string;
    type: string;
}

export interface VDom {
    tag: string;
    type: number;
    attrs: VAttr[];
    child: VDom[];
    content: string;
}

type exHtml = string | HTMLfn | number;

type HTMLfn = (...args: any[]) => PreHTML | string | number | Node;

export type ValueMap = Map<string, any>;

export interface PreHTML {
    vmap: ValueMap;
    vdom: VDom;
    [key: string]: any;
}

// 这里比较不优雅，就是以这个id字符串来判断我们的值是怎么存储的
// 理论上说，我们可以解析一下，做个索引来标记来自哪里
// 这么写相对简单点...
// [TODO]
export const genID = () =>
    (~~(Math.random() * 6 + 10)).toString(16) +
    'xxxxxxxx'.replace(/[xy]/g, c => {
        // tslint:disable-next-line
        const r = (Math.random() * 16) | 0,
            // tslint:disable-next-line
            v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });

// 来自 lithtml 作用就是匹配 attr 赋值字段，相对好理解
// 也是属于一个黑科技的存在，对于容错不太友好
// 理想中的话，还是需要提供 ide 支持
const lastAttributeNameRegex = /([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

const genPoint = (i: string | null, n: string | null) => `[${n || '$$'}:${i || genID()}]`;

const HtmlSymbol = Symbol('HtmlSymbol');
export const isHTML = (o: any) => (typeof o === 'object' ? o[HtmlSymbol] : false);

let TEMP_ELEM = null;
// html 字符串解析为我们的虚拟 dom 对象
// 利用的是 h5 的新特性，其实也就是使用了被浏览器包装好的 dom 解析器
const parseHTML = (htmlText: string) => {
    const $temp = (() => {
        if (!TEMP_ELEM) {
            TEMP_ELEM = document.createElement('template');
        }
        TEMP_ELEM.innerHTML = htmlText;
        return TEMP_ELEM;
    })();
    return vify($temp.content);

    function vify($elem: HTMLElement) {
        return {
            // $: $elem,
            tag: $elem.nodeName.toLowerCase(),
            type: $elem.nodeType,
            attrs: !$elem.attributes
                ? []
                : Array.from($elem.attributes).map($a => ({
                    key: $a.name || $a.nodeName,
                    type: $a.nodeType,
                    val: $a.value || $a.nodeValue || $a.textContent,
                })),
            child: !$elem.childNodes
                ? []
                : Array.from($elem.childNodes).map($n => vify($n as HTMLElement)),
            content: $elem.nodeType === 3 ? $elem.nodeValue || $elem.textContent : null,
        };
    }
};

// html 语句，使用起来类似于 jsx 语法
export const html = (strings: string[], ...values: any[]): PreHTML => {
    const tokens = tokenizer(strings, values);
    let PreHtmlText = '';
    const valMap = new Map() as ValueMap;
    for (const t of tokens) {
        const id = genID();
        switch (typeof t) {
            case 'string':
                PreHtmlText += t;
                break;
            case 'function':
                valMap.set(id, t);
                PreHtmlText += genPoint(id, 'text');
                break;
            case 'object':
                if (isDOM(t)) {
                    valMap.set(id, t);
                    PreHtmlText += genPoint(id, 'text');
                    break;
                }
                if (Object.hasOwnProperty.call(t, 'val') && Object.hasOwnProperty.call(t, 'key')) {
                    valMap.set(id, t.val);
                    PreHtmlText += ` ${t.key}=${genPoint(id, 'attr')} `;
                    break;
                }
                if (Array.isArray(t)) {
                    valMap.set(id, t);
                    PreHtmlText += genPoint(id, 'arr');
                    break;
                }
                // 对象，比如attr把上层的属性向下传递的时候
                // 如果是内容里的话，会直接渲染成文本节点
                valMap.set(id, t);
                PreHtmlText += ` ${id}=${genPoint(id, 'obj')} `;
                break;
        }
    }
    return {
        vdom: parseHTML(PreHtmlText),
        vmap: valMap,
        [HtmlSymbol]: true,
    };
};

interface AttrToken {
    key: string;
    val: exHtml;
}

type Token = exHtml | AttrToken | Node | any;

// 将我们拿到的插值参数组合成数组
function tokenizer(strings: string[], values: exHtml[]) {
    const tokens: Token[] = [];

    for (let i = 0; i < strings.length; i++) {
        const htmlText = strings[i];
        const match = lastAttributeNameRegex.exec(htmlText);
        if (match) {
            const key = match[2];
            const val = values[i];
            const clearHtml = htmlText.substring(0, match.index);
            if (clearHtml) {
                tokens.push(clearHtml)
            }
            tokens.push({ key, val })
            continue;
        } else {
            tokens.push(htmlText);
        }
        if (i < values.length) {
            tokens.push(values[i]);
        }
    }

    return tokens;
}
