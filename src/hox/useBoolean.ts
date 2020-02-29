import { useState } from './useState';

export const useBoolean = (init = false) => {
    const state = useState(init);
    const toggle = () => (state.v = !state.v);
    const setTrue = () => (state.v = true);
    const setFalse = () => (state.v = false);
    return {
        state: () => state.v,
        toggle,
        setTrue,
        setFalse,
    };
};
