# HerbJs
🌿The whole HerbJs has a characteristic taste and odour.

基于function，构建你的application

# Overview
与 TacoJs 不同的是，这里我们的将抛弃一切工程化的东西，而尝试最新的编程范式

> 当然也有很多相似的，响应式和vdom以及diff模块依然复用，
> 利用新语法规范，完全改变Taco中比较中规中矩的开发流程

# Usage
```
npm run dev:w
```

# idea
> 简单说就是不用标记依赖的hooks

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
    <textarea oninput=${$input}></textarea>
`

const app = html`
<div class="app-root-box">
    OHHHHHHHH! THIS IS component!
    ${Label({
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

# async programing
```ts
render(html`
<p>
    cpu: ${async function*(){
            while(!window.exit){
                yield get('/cpu/')
                        .then(res => res.data);
                delay(500);
            }
        }}
</p>
<p>
    time: ${async function*(){
            while(!window.exit){
                yield Date.now();
                delay(1000);
            }
        }}
</p>
`,document.body)
```

# ChangeLog
feat: 新例子和新功能

1 card 组件
2 组件组合


# TODO
- reactive 无法包装非 object 对象的问题
  > 我的想法是对于所有非 object 对象都包到一个透明 object 中，然后返回一个通过 defineProperty api 将行为映射到现在的 proxy 上，这样来做会简单点，比如按钮的开关状态就很需要这种非 object 的响应式对象
- 代码中未完成的部分搜索`[TODO]`关键字
- [ ] 不要使用随机字符串做标记的模式
- [x] 迁移taco中的模块
- [ ] 在Trello中创建独立板块
- [ ] 发布npm（白嫖全球CDN）
- [ ] 扩充文档
- [ ] html模板中支持async gen函数
- [ ] webcomponent elem

# License
GPL-3.0
