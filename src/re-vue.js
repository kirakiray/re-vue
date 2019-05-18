(() => {
    // common
    // 事件记录器
    // const EVENTS = "_events";
    // const DATA = "_data";
    // const KEYS = "_keys";
    // const OBS = "_obs";

    const EVENTS = Symbol("events");
    const DATA = Symbol("data");
    const KEYS = Symbol("keys");
    const OBS = Symbol("obs");

    // public function
    const transToEle = (str) => {
        let tdiv = document.createElement("div");
        tdiv.innerHTML = str;
        let ele = tdiv.children[0];
        tdiv.removeChild(ele);
        return ele;
    };

    // business function
    const getEventsArr = (eventName, tar) => {
        let tarEves = tar[EVENTS].get(eventName);
        if (!tarEves) {
            tarEves = [];
            tar[EVENTS].set(eventName, tarEves);
        }
        return tarEves;
    };

    // obs对象上的change方法，告诉它可以重新渲染了
    const obsObjChange = (obj, options) => {
        obj[OBS].obsChangeCall && obj[OBS].obsChangeCall(options);

        // 兄弟层变动
        (options.type === "change") && obj[OBS].bros.forEach(e => {
            e[options.k] = options.val;
        });

        // 告诉父对象变动
        obj[OBS].pars.forEach(e => {
            let tarKey;
            Object.keys(e).some(k => {
                let val = e[k];
                if (obj === val) {
                    tarKey = k;
                    return true;
                }
            });
            obsObjChange(e, {
                type: "up",
                k: tarKey
            });
        });
    }

    let newArrayProto = {};
    ["push", "pop", "shift", "unshift", "reverse", "sort", "fill", "splice"].forEach(fName => {
        let tarFun = Array.prototype[fName];

        // 重构方法，使其触发冒泡
        newArrayProto[fName] = {
            value(...args) {
                // 初始化参数
                args.forEach(e => initObj(e, {
                    pars: [this]
                }));
                let r = tarFun.call(this, ...args);
                obsObjChange(this, {
                    type: "up"
                });
                return r;
            }
        };
    });

    // 转换成observer对象
    const initObj = (obj, options = {}) => {
        // 不属于对象或者初始化过的都不用进行下去了
        if (!(obj instanceof Object) || obj[OBS]) {
            return;
        }

        // 判断类型
        if (obj instanceof Array) {
            obj.forEach(e => {
                // 转换内部对象
                initObj(e, {
                    pars: [obj]
                });
            });

            // 重构数组内的方法
            Object.defineProperties(obj, newArrayProto);
        } else if (obj instanceof Object) {
            // 重新赋值数据
            for (let k in obj) {
                let val = obj[k];

                // val是对象的话也要转换
                initObj(val, {
                    pars: [obj]
                });

                Object.defineProperty(obj, k, {
                    get() {
                        return val;
                    },
                    set(d) {
                        // 相同的值就别触发变动了
                        if (val === d) {
                            return;
                        }

                        val = d;
                        obsObjChange(obj, {
                            type: "change",
                            k,
                            val: d
                        });
                    }
                });
            }
        }

        // 添加obs属性
        Object.defineProperties(obj, {
            // 定义obs数据对象
            [OBS]: {
                value: {
                    // 需要告诉父层的数据
                    pars: options.pars || [],
                    // 同级层的数据
                    bros: [],
                    // 触发obs的callback
                    obsChangeCall() {}
                }
            }
        });
    }

    // 初始化渲染进程
    const initVue = (tar) => {
        // 正则匹配内部的 {{}} 文本型元素
        let newInnerHTML = tar.$el.innerHTML.replace(/\{\{.+?\}\}/g, (text) => {
            // 获取关键key
            let key = text.replace(/\{/g, "").replace(/\}/g, "").trim();
            // 若key带有点，就不处理
            if (key.includes(".")) {
                return text;
            } else {
                return `<v-span v-key="${key}"></v-span>`;
            }
        });

        // 置换 innerHTML
        tar.$el.innerHTML = newInnerHTML;

        // 置换v-span
        Array.from(tar.$el.querySelectorAll('v-span')).forEach(vSpan => {
            // 获取关机key
            let vKey = vSpan.getAttribute("v-key");

            // 替换成text
            let tarText = new Text();
            let parentNode = vSpan.parentNode;
            parentNode.insertBefore(tarText, vSpan);
            parentNode.removeChild(vSpan);

            // 记录事件
            tar.on(`change-${vKey}`, data => {
                tarText.textContent = data.value;
            });
        });

        // v-for指令
        Array.from(tar.$el.querySelectorAll('[v-for]')).forEach(ele => {
            let forValue = ele.getAttribute("v-for");

            // 分组数据
            let o_arr = forValue.split(" in ");

            // 内部文本
            let context = ele.innerText;
            context = context.replace(/\{/g, "").replace(/}/g, "").trim();

            // 内部文本分组
            let c_arr = context.split(".");

            // 获取html
            ele.removeAttribute("v-for");
            ele.innerText = "";
            let tempHTML = ele.outerHTML;

            // 添加定位元素
            let pointEle = new Text();
            ele.parentNode.insertBefore(pointEle, ele);
            ele.parentNode.removeChild(ele);

            // 存储渲染的元素
            let renders = [];

            tar.on(`change-${o_arr[1]}`, d => {
                // 去掉旧的
                renders.forEach(e => {
                    e.parentNode.removeChild(e);
                });

                // 清空
                renders = [];

                // 遍历添加
                d.value.forEach(e => {
                    // 转换元素
                    let cEle = transToEle(tempHTML);

                    renders.push(cEle);

                    // 添加内部元素
                    cEle.innerHTML = e[c_arr[1]];
                    pointEle.parentNode.insertBefore(cEle, pointEle);
                });
            });
        });

        // 所有元素修正
        Array.from(tar.$el.querySelectorAll(`*`)).forEach(ele => {
            Array.from(ele.attributes).forEach(aObj => {
                let aName = aObj.name;
                let aValue = aObj.value;

                // v-bind修正
                if (/^v\-bind:/.test(aName)) {
                    let bindName = aName.replace(/^v\-bind:/, "");

                    switch (bindName) {
                        case "title":
                            tar.on(`change-${aValue}`, data => {
                                ele.setAttribute("title", data.value);
                            });
                            break;
                    }

                    // 去除表达属性
                    ele.attributes.removeNamedItem(aName);
                }

                // v-if修正
                if (/^v\-if/.test(aName)) {
                    tar.on(`change-${aValue}`, data => {
                        if (data.value) {
                            ele.style.display = "";
                        } else {
                            ele.style.display = "none";
                        }
                    });
                }

                // v-on修正
                if (/^v\-on:/.test(aName)) {
                    let onName = aName.replace(/^v\-on:/, "");

                    // 绑定方法
                    ele.addEventListener(onName, () => {
                        tar[aValue]();
                    });
                }

                // v-model修正
                if (/^v\-model/.test(aName)) {
                    ele.addEventListener("input", function () {
                        tar[aValue] = this.value;
                    });
                    tar.on(`change-${aValue}`, data => {
                        ele.value = data.value;
                    });
                }
            });
        });
    }

    // main class
    function Vue(options) {
        // 默认数据
        let defaults = {
            // 挂载数据对象
            data: {},
            methods: {}
        };
        Object.assign(defaults, options);

        let {
            data,
            methods
        } = defaults;

        //获取主体element
        let ele = document.querySelector(defaults.el);

        // 获取所有keys
        let keys = Object.keys(data);

        // 主体数据合并
        Object.defineProperties(this, {
            [EVENTS]: {
                value: new Map()
            },
            $el: {
                enumerable: true,
                value: ele
            },
            [DATA]: {
                value: data
            },
            [KEYS]: {
                value: new Set(keys)
            }
        });

        // 挂载proxy主体
        let reobj = new Proxy(this, vueHandler);

        // 初始化元素 
        initVue(reobj);

        // 数据触发
        keys.forEach(k => {
            this.emit(`change-${k}`, {
                value: data[k]
            });
        });

        // 合并方法
        Object.assign(this, methods);
        // obs化对象
        initObj(data);
        data[OBS].bros.push(reobj);
        data[OBS].obsChangeCall = (e) => {
            // 触发改动
            this.emit(`change-${e.k}`, {
                value: data[e.k]
            });
        }

        return reobj;
    }
    Object.assign(Vue.prototype, {
        // 事件注册
        on(eventName, callback) {
            let tarArr = getEventsArr(eventName, this);
            tarArr.push({
                callback
            });
        },
        // 事件取消
        off(eventName, callback) {
            if (!eventName) {
                return;
            }
            if (callback) {
                let tarArr = getEventsArr(eventName, this);
                let tarId = tarArr.findIndex(e => e.callback == callback);
                (tarId > -1) && this[EVENTS].splice(tarId, 1);
            } else {
                this[EVENTS].delete(eventName);
            }
        },
        // 事件触发
        emit(eventName, data) {
            let tarArr = getEventsArr(eventName, this);
            tarArr.forEach(e => {
                e.callback(data);
            });
        }
    });

    // proxyHandler
    const vueHandler = {
        get: function (target, key, receiver) {
            // 判断是否在keys上的key
            if (target[KEYS].has(key)) {
                // 从data上获取数据
                return target[DATA][key];
            }
            // 直接默认的方法
            return Reflect.get(target, key, receiver);
        },
        set: function (target, key, value, receiver) {
            // 判断是否在keys上的key
            if (target[KEYS].has(key)) {
                // 改动data上的数据，并触发变动
                target[DATA][key] = value;

                target.emit(`change-${key}`, {
                    value
                });

                return true;
            }
            return Reflect.set(target, key, value, receiver);
        }
    };

    // glo
    window.Vue = Vue;
})();