import { useEffect } from './useEffect';
import { useState } from './useState';

const noop = (...x: any[]) => '';

export const useEmitter = () => {
    const emitterCount = useState(0);
    return {
        count: emitterCount,
        emit() {
            emitterCount.v += 1;
        },
        effect(fn: () => {}) {
            useEffect(() => {
                noop(emitterCount.v);
                fn();
            });
        },
    };
};
