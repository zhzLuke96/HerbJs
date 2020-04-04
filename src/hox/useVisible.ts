import { useState } from './useState';
import { nextTick } from '../reactive/nxtTick';

export const useVisible = <T extends HTMLElement>() => {
    const state = useState(true);
    return {
        isVisibility: () => state.v,
        visibleRef(elem: T) {
            nextTick(() => {
                const intersectionObserver = new IntersectionObserver(entries => {
                    if (entries[0].intersectionRatio <= 0) {
                        if (state.v) {
                            state.v = false;
                        }
                    } else {
                        if (!state.v) {
                            state.v = true;
                        }
                    }
                });
                intersectionObserver.observe(elem);
            })
        },
    };
};
