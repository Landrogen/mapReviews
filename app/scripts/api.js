export default class API {
    constructor() {
        this.storage = localStorage;
        this.state = new Map();
    }

    get() {
        this.state = JSON.parse(this.storage['geoObjects']);
    }

    save() {
        this.storage['geoObjects'] = JSON.stringify([...this.state]);
    }
}