# HerbJs
🌿The whole HerbJs has a characteristic taste and odour.

基于function，构建你的application

# Overview
与 TacoJs 不同的是，这里我们的将抛弃一切工程化的东西，而尝试最新的编程范式

# idea
```ts
import { reactive, html } from "@HerbJs/herb";
import { Reactivity } from "@HerbJs/types";
import { elem, Elem } from "@HerbJs/elem";

type MyState {/* ... */}

const state: Reactivity<MyState> = reactive<MyState>({
    title: "welcome",
    uname: "luke.zhang",
    titleStyle: "color: red;",
})

type LabelProps {/* ... */}

// component
const MyEditor: Elem<LabelProps> = ({ title, $input, style }) => elem`
    <style>
        ${() => style}
    </style>
    <h4>${() => title}</h4>
    <textarea oninput=${() => $input}></textarea>
`

const app = html`
<div class="app-root-box">
    OHHHHHHHH! THIS IS component!
    ${() => Label({
        title: "HerbJs Editor",
        style: `
            h4{
                color: skyblue;
                text-size: 2rem;
            }
            textarea{
                padding: 1rem;
            }
        `,
        $input = $e => console.log("input!", $e.target.value),
    })}
</div>
`

const $root = document.querySelector("#app");

app.mount($root)
```

# License
GPL-3.0
