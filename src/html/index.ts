import { html as _html } from './html';
import { render } from './renderx';

export const html = (strings: TemplateStringsArray, ...values: any[]) => {
    return render(_html(Array.from(strings), ...values));
};
