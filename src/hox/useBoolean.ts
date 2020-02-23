import { useState } from './useState'

export const useBoolean = (init = false) => {
    const _state = useState(init)
    const toggle = () => _state.v = !_state.v
    const setTrue = () => _state.v = true
    const setFalse = () => _state.v = false
    return {
        state: () => _state.v,
        toggle,
        setTrue,
        setFalse
    }
}