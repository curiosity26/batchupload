/**
 * Author: Alex Boyce <curiosity26@gmail.com>
 * Date: 2017-08-24
 **/

class Emitter {
    private events = new Map();

    on(type, listener) {
        if (!this.events.has(type)) {
            this.events.set(type, new Set());
        }

        this.events.get(type).add(listener);
    };

    off(type, listener) {
        const events = this.events.get(type);
        if (!!events) {
            events.delete(listener);
        }
    };

    clear(type) {
        this.events.set(type, new Set());
    };

    private emit(cb, event) {
        // Handle callbacks asynchronously
        setTimeout(function() {
            cb(event);
        }, 0);

    };

    dispatch(event) {
        if (!!event.type) {
            const type = event.type;
            if (this.events.has(type)) {
                event.target = this;
                this.events.get(type).forEach((cb) => {
                    this.emit(cb.bind(event.target), event);
                });
            }
        }
    };
}

export { Emitter };