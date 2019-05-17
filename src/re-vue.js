(() => {
    // common
    // 事件记录器
    // const EVENTS = "_events";
    // const DATA = "_data";
    // const KEYS = "_keys";

    const EVENTS = Symbol("events");
    const DATA = Symbol("data");
    const KEYS = Symbol("keys");

    // function
    const getEventsArr = (eventName, tar) => {
        let tarEves = tar[EVENTS].get(eventName);
        if (!tarEves) {
            tarEves = [];
            tar[EVENTS].set(eventName, tarEves);
        }
        return tarEves;
    };

    // 初始化渲染进程
    const initVue = (tar, keys) => {
        // 正则匹配内部的 {{}} 文本型元素
        let newInnerHTML = tar.$el.innerHTML.replace(/\{\{.+?\}\}/g, (text) => {
            // 获取关键key
            let key = text.replace(/\{/g, "").replace(/\}/g, "").trim();
            return `<v-span v-key="${key}"></v-span>`;
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
            });
        });
    }

    // main class
    function Vue(options) {
        // 默认数据
        let defaults = {
            // 挂载数据对象
            data: {}
        };
        Object.assign(defaults, options);

        let {
            data
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

        // 初始化元素 
        initVue(this, keys);

        // 数据触发
        keys.forEach(k => {
            this.emit(`change-${k}`, {
                value: data[k]
            });
        });

        // 挂载proxy主体
        return new Proxy(this, vueHandler);
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