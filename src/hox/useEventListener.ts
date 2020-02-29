export const useEventListener = <T extends HTMLElement>(
    type: string,
    handler: (...arg: any[]) => void,
) => {
    return (elem: T) => elem.addEventListener(type, handler);
};
