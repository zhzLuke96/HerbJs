import { useState } from './useState';

export const useVisible = <T extends HTMLElement>() => {
    const _state = useState(false)
    return {
        isVisibility: () => _state.v,
        visibleRef(elem: T) {
            const intersectionObserver = new IntersectionObserver(function (entries) {
                if (entries[0].intersectionRatio <= 0) {
                    if (_state.v) {
                        _state.v = false
                    }
                } else {
                    if (!_state.v) {
                        _state.v = true
                    }
                }
            })
            intersectionObserver.observe(elem)
        }
    }
}