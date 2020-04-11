# 自增计时器

```ts
const secondsToHHMMSS = (seconds) => {
    // ... seconds => HH:MM:SS
    // ... 61 => 01:01
}

const useAutoIncNumber = (initial = 0) => {
    const number = useState(initial)

    let timer = null;
    const start = () => {
        timer = setInterval(() => {
            number.v += 1
        }, 10)
    }
    const stop = () => {
        clearInterval(timer)
    }
    return {
        number,
        start,
        stop
    }
}

const useAutoIncTime = (initial = 0) => {
    const {
        number,
        start,
        stop
    } = useAutoIncNumber(initial)
    const time = useState('00:00')
    useEffect(() => {
        time.v = secondsToHHMMSS(number.v)
    })
    return {
        time,
        start,
        stop,
        reset() {
            number.v = 0
        }
    }
}
```

# 随机浮动数

```ts
const useRandomFloatNumber = (initial = 10, config = {}, interval = 300) => {
    const {
        max = 100, min = 0
    } = config
    const number = useState(initial)

    let timer = null;
    const nextNumber = () => {
        const base = Math.random() > 0.5 ? -1 : 1;
        const n = Math.floor(Math.random() * 10);
        const next = number.v + (base * n)
        number.v = Math.max(Math.min(next, max), min)

        timer = setTimeout(() => {
            nextNumber()
        }, interval)
    }
    const start = () => {
        nextNumber()
    }
    const stop = () => {
        clearTimeout(timer)
    }
    return {
        number,
        start,
        stop
    }
}
```

# 根据鼠标位置位移元素
```ts
const mousePositionOffsetPercentage = (checkVisible = true) => {
    const mouse = useMouse()
    const {
        isVisibility,
        visibleRef
    } = useVisible()
    return useValue(mouse, ({
            screenY,
            screenX
        }) => {
            if (checkVisible && !isVisibility()) {
                return {
                    deltaY: 0,
                    deltaX: 0
                }
            }
            const {
                outerHeight,
                outerWidth
            } = window
            const deltaY = (screenY - outerHeight / 2) / outerHeight / 2
            const deltaX = (screenX - outerWidth / 2) / outerWidth / 2
            return {
                deltaY,
                deltaX
            }
        }
    )
}
```

# H2O状态机
```ts
function H2O() {
    const [current, transition] = useStateMachine({
        initial: '液态',
        '液态': {
            freeze: '固态',
            boil: '气态',
            value: '10摄氏度'
        },
        '固态': {
            melt: '液态',
            value: '0摄氏度'
        },
        '气态': {
            chill: '液态',
            value: '100摄氏度'
        }
    })
    return html `
    <div>
        <p>你的 H2O 现在是${()=>current.state}.</p>
        <p>你的 H2O 的温度是${()=>current.value}.</p>
        ${Button({
            disabled: ()=> !transition['to液态'],
            onClick: ()=> transition['to液态'](),
            text: '液化'
        })}
        ${Button({
            disabled: ()=> !transition['to固态'],
            onClick: ()=> transition.freeze(),
            text: '固化'
        })}
        ${Button({
            disabled: ()=> !transition['to气态'],
            onClick: ()=> transition.boil(),
            text: '气化'
        })}
    </div>`
}
```

