(() => {
    // common
    // 事件记录器
    // const EVENTS = "_events";
    // const DATA = "_data";

    const EVENTS = Symbol("events");
    const DATA = Symbol("data");

    // function
    const getEventsArr = (eventName, tar) => {
        let tarEves = tar[EVENTS].get(eventName);
        if (!tarEves) {
            tarEves = [];
            tar[EVENTS].set(eventName, tarEves);
        }
        return tarEves;
    };

    // main class
    function Vue(options) {
        //获取主体element
        let ele = document.querySelector(options.el);

        // 主体数据合并
        Object.assign(this, {
            // 事件寄宿对象
            [EVENTS]: new Map(),
            // 主体元素
            $el: ele,
            // 主体元素
            [DATA]: options.data
        });
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


    // glo
    window.Vue = Vue;
})();