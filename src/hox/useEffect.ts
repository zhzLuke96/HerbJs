import { nextTick } from '../reactive/nxtTick';
import { effect } from '../reactive/reactivity';

// 渲染问题，用nexttick包装之后可以在html解析之后执行effect
export const useEffect = (fn: () => void) => nextTick(() => effect(fn));
