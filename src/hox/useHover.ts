import { useState } from './useState';
import { useEventListener } from './useEventListener';

export const useHover = <T extends HTMLElement>() => {
    const _state = useState(false)
    const refOver = useEventListener('mouseover', () => _state.v = true)
    const refOut = useEventListener('mouseout', () => _state.v = false)
    return {
        isHovering: () => _state.v,
        hoverRef(elem: T) {
            refOver(elem)
            refOut(elem)
        }
    }
}