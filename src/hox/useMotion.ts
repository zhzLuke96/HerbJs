import { UniqueId } from '../common';

const aniTimeout = (cb, interval) => {
    let stime = performance.now()
    let etime = stime
    let loop = () => {
        this.timeoutTimer = requestAnimationFrame(loop)
        etime = performance.now()
        if (etime - stime >= interval) {
            cb()
            cancelAnimationFrame(this.timeoutTimer)
        }
    }
    return requestAnimationFrame(loop)
}
const clearAniTimeout = cancelAnimationFrame

interface AnimationOption {
    duration?: number
    delay?: number
    ease?: string
    [key: string]: string | number
}

const cssTimer = (val: number | string) => !isNaN(val as number) ? `${val}ms` : val

const cssConverter = {
    x(val: string) {
        return { transform: ` translateX(${val}) ` }
    },
    y(val: string) {
        return { transform: ` translateY(${val}) ` }
    },
    duration(val: string) {
        return { 'transition-duration': cssTimer(val) }
    },
    delay(val: string) {
        return { 'transition-delay': cssTimer(val) }
    },
    ease(val: string) {
        return { 'transition-timing-function': cssTimer(val) }
    }
}

const cssTextFromObj = (css) => {
    let text = ''
    for (const key in css) {
        if (css.hasOwnProperty(key)) {
            const val = css[key];
            text += `${key}:${val};`
        }
    }
    return text
}

const cssTextByAnimation = (aniOpt: AnimationOption, className: string) => {
    const css = Object.keys(aniOpt)
        .filter(key => ['duration', 'delay', 'ease'].indexOf(key) === -1)
        .reduce((all: any, key) => {
            let css: any = {}
            if (key in cssConverter) {
                css = cssConverter[key](aniOpt[key])
            } else {
                css = { [key]: aniOpt[key] }
            }
            if (css.transform) {
                css.transform = (all.transform || '') + ' ' + css.transform;
            }
            return { ...all, ...css }
        }, {})
    const properties = Object.keys(css)

    const duration = aniOpt.duration ? `transition-duration: ${aniOpt.duration}ms;` : ''
    const delay = aniOpt.delay ? `transition-delay: ${aniOpt.delay}ms;` : ''
    const ease = aniOpt.ease ? `transition-timing-function: ${aniOpt.ease};` : ''
    const property = properties.length ? `transition-property: ${properties.join(',')};` : ''

    return `.${className}{${duration}${delay}${ease}${property}${cssTextFromObj(css)}}`
}

export const useMotion = (animLs: AnimationOption[]) => {
    const classNames = animLs.map((_, idx) => 'motion_' + UniqueId() + idx)
    const styleNode = document.createElement('style')
    styleNode.type = 'text/css'

    styleNode.innerHTML = animLs.map((opt, idx) => cssTextByAnimation(opt, classNames[idx])).join('')
    document.head.appendChild(styleNode)

    let ref: HTMLElement | null = null
    let timer = null

    function stop() {
        clearAniTimeout(timer);
        classNames.forEach(className => ref && ref.classList.remove(className));
    }

    return {
        motionRef(elem) {
            ref = elem
        },
        start() {
            if (!animLs || animLs.length === 0) {
                return
            }
            stop()
            nxtMotion(0)

            function nxtMotion(idx: number) {
                if (!ref) {
                    return
                }
                if (idx === animLs.length) {
                    stop()
                    return
                }

                const className = classNames[idx]
                const { duration = 1, delay = 1 } = animLs[idx]
                ref.classList.add(className)

                timer = aniTimeout(() => {
                    ref.classList.remove(className)
                    nxtMotion(idx + 1)
                }, duration + delay);
            }
        },
        stop
    }
}