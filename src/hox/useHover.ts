import { useEventListener } from './useEventListener';
import { useState } from './useState';

export const useHover = <T extends HTMLElement>() => {
    const state = useState(false);
    const refOver = useEventListener('mouseover', () => (state.v = true));
    const refOut = useEventListener('mouseout', () => (state.v = false));
    return {
        isHovering: () => state.v,
        hoverRef(elem: T) {
            refOver(elem);
            refOut(elem);
        },
    };
};
