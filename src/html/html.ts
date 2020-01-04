
interface VAttr {
    key: string
    val: string
    type: string
}

export interface VDom {
    tag: string
    type: number
    attrs: Array<VAttr>
    child: Array<VDom>
    content: string
}

type exHtml = string | HTMLfn | number

type HTMLfn = (...args: any[]) => preHTML | string | number

export type ValueMap = Map<string, exHtml>

export interface preHTML {
    vmap: ValueMap
    vdom: VDom
    [key: string]: any
}


export const _id = () => 'xxxxxxxx-xxxx'.replace(/[xy]/g, c => {
    var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
})

const lastAttributeNameRegex =
    /([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

const _point = (i: string | null, n: string | null) => `[${n || '$$'}:${i || _id()}]`

const _isHTML = Symbol('_isHTML')
export const isHTML = (o: any) => typeof o === "object" ? o[_isHTML] : false

let $temp_elem = null;
const parseHTML = (html: string) => {
    const $temp = (() => {
        if (!$temp_elem) {
            $temp_elem = document.createElement("template");
        }
        $temp_elem.innerHTML = html;
        return $temp_elem
    })()
    return vify($temp.content)

    function vify($elem: HTMLElement) {
        return {
            // $: $elem,
            tag: $elem.nodeName.toLowerCase(),
            type: $elem.nodeType,
            attrs: !$elem.attributes ? [] : Array.from($elem.attributes).map($a => ({
                k: ($a.name || $a.nodeName).toLowerCase(),
                t: $a.nodeType,
                v: $a.value || $a.nodeValue || $a.textContent,
            })),
            child: !$elem.childNodes ? [] : Array.from($elem.childNodes).map($n => vify($n as HTMLElement)),
            content: $elem.nodeType === 3 ? $elem.nodeValue || $elem.textContent : null
        }
    }
}


export const html = (strings: string[], ...values: any[]): preHTML => {
    const tokens = tokenizer(strings, values)
    let preHTML = ''
    const valMap = new Map() as ValueMap
    for (const t of tokens) {
        switch (typeof t) {
            case "string":
                preHTML += t
                break
            case "function":
                const fid = _id()
                valMap.set(fid, t)
                preHTML += _point(fid, 'text')
                break
            case "object":
                const aid = _id()
                valMap.set(aid, t.val)
                preHTML += ` ${t.key}=${_point(aid, 'attr')}`
                break
        }
    }
    return {
        vdom: parseHTML(preHTML),
        vmap: valMap,
        [_isHTML]: true
    }
}

interface AttrToken {
    key: string
    val: exHtml
}

type Token = exHtml | AttrToken

function tokenizer(strings: string[], values: exHtml[]) {
    let tokens: Token[] = []

    for (let i = 0; i < strings.length; i++) {
        const html = strings[i];
        const match = lastAttributeNameRegex.exec(html)
        if (match) {
            const key = match[2]
            const val = values[i]
            const clearHtml = html.substring(0, match.index)
            tokens.push(clearHtml, {
                key,
                val
            })
            continue
        } else {
            tokens.push(html)
        }
        if (i < values.length) {
            tokens.push(values[i])
        }
    }

    return tokens
}
