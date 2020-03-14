import { useEffect } from './useEffect';
import { useState } from './useState';

export const useSessionState = (key: string, initialState: any) => {
    const storageValue = sessionStorage.getItem(key);
    if (storageValue) {
        initialState = storageValue;
    }
    const value = useState(initialState);
    useEffect(() => {
        sessionStorage.setItem(key, value.v);
    });
    return value;
};

export const useLocalState = (key: string, initialState: any) => {
    const storageValue = localStorage.getItem(key);
    if (storageValue) {
        initialState = storageValue;
    }
    const value = useState(initialState);
    useEffect(() => {
        localStorage.setItem(key, value.v);
    });
    return value;
};
