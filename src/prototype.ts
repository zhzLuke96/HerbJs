const TriggerDOMSymbol = Symbol('TriggerDOMSymbol');

export const isTriggerDOM = (dom: EventTarget) => dom.hasOwnProperty(TriggerDOMSymbol);

const originalAddEventListener = EventTarget.prototype.addEventListener;

EventTarget.prototype.addEventListener = (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options: boolean | AddEventListenerOptions,
) => {
    originalAddEventListener(type, listener, options);
    this[TriggerDOMSymbol] = true;
};
