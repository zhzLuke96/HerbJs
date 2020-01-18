export { compose } from './html/compose';
export { html as _html } from './html/html';
export { reactive } from './reactive/reactivity';

import { html as _html } from './html/html';
import { compose } from './html/compose';

export const html = (strings: string[], ...arg) => compose(_html(strings, ...arg))



