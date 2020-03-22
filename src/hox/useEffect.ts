import { nextTick } from '../reactive/nxtTick';
import { effect } from '../reactive/reactivity';

/**
 * 因为要执行来捕获依赖，所以将在元素还没渲染的时候就调用
 * 这里用nextTick简单处理一下
 *
 * TODO：
 * Effect缺失了回收机制
 * 相对我们的实现，这个不是特别严重的问题，毕竟很少会重绘
 *
 * 但是引入的diff算法，会带来回收问题
 * 我的想法是我们的useEffect做一个返回捕获的操作，将effect的结果储存下来
 * 在diff算法需要移除元素的时候，就触发相应的回收
 * 
 * 或者，将被绑定事件的dom都保存下来，如果再次使用的话直接使用
 * 但是需要重构的地方比较多，因为我们的渲染过程是会执行的
 * （不过cache已经移除的元素也是一个好方法
 * 对于diff算法来说还是有必要的）
 *
 * eg:
 * useEffect(()=>{
 *      console.log('changed', state.value)
 * })
 */

// 渲染问题，用nexttick包装之后可以在html解析之后执行effect
export const useEffect = (fn: () => void) => nextTick(() => effect(fn));
