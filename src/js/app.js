import balloonTpl from './mapTemplates/balloon.main';
import balloonReviewsTpl from './mapTemplates/balloon.reviews';
import clustererTpl from "./mapTemplates/clusterer.carousel";

import {getCoordinates} from "./mapHelpers";
import {Point} from "../models/point";

export default class appMap {
    constructor(domSelector) {
        this.mapElement = document.querySelector(domSelector);
        this.geoCache = new Map();
        this.reviewPoints = [];
        this.loadGeoCache();
        this.loadReviews();

        this.initHandlers();
        ymaps.ready(() => this.initYandexMap());
    }

    initHandlers() {
        document.addEventListener('click', e => {
            const {addReview} = e.target.dataset;
            if (addReview) {
                e.preventDefault();
                const data = this.getFormData(e.target.closest('form'));
                data.date = date = new Date().toLocaleString();
                this.addPlaceReview(data);
                this.showMainBalloon({coords: data.coords, address: data.address});
                this.saveReviews();
            }
        });

        document.addEventListener('click', e => {
            const {placeMarkId} = e.target.dataset;
            if (placeMarkId) {
                e.preventDefault();
                const point = this.reviewPoints[placeMarkId];
                this.showMainBalloon({coords: point.coords, address: point.address});
            }
        })
    }

    async initYandexMap() {
        // Инициализация карты
        this.yaMap = new ymaps.Map(this.mapElement, {
            center: [55.76, 37.64],
            zoom: 12
        });

        // Добавляем реакцию на клик по карте
        this.yaMap.events.add('click', async (e) => {
            const coords = await getCoordinates(e),
                address = await this.getGeoAddress(coords);

            this.showMainBalloon({coords, address});
        });

        // Создаем кластер
        this.cluster = new ymaps.Clusterer(
            {
                clusterDisableClickZoom: true,
                clusterBalloonContentLayout: 'cluster#balloonCarousel',
                clusterBalloonItemContentLayout: clustererTpl(),
                clusterBalloonPanelMaxMapArea: 0,
                clusterBalloonContentLayoutWidth: 200,
                clusterBalloonContentLayoutHeight: 130,
                clusterBalloonPagerSize: 5
            });

        // Добавляем кластер
        this.yaMap.geoObjects.add(this.cluster);

        for (const point of this.loadReviews()) {
            this.addPlaceReview(point);
        }
    }

    /**
     * загрузка отзывов из localStorage
     * @param point
     */
    loadReviews(point) {
        return JSON.parse(localStorage['reviews'] || '[]');
    }

    /**
     * Сохранение отзывов в localStorage
     * @param point
     */
    saveReviews() {
        localStorage['reviews'] = JSON.stringify([...this.reviewPoints]);
    }

    /**
     * Загрузка данных по геокодировании
     */
    loadGeoCache() {
        const storageData = JSON.parse(localStorage['geoCache'] || '[]');
        storageData.reduce((map, item) => map.set(...item), this.geoCache);
    }

    /**
     * Сохранение данных о геокодировании
     */
    saveGeoCache() {
        localStorage['geoCache'] = JSON.stringify([...this.geoCache]);
    }

    async getGeoAddress(coords) {
        let key = coords.join(':');

        if (this.geoCache.has(key)) {
            return this.geoCache.get(key);
        }

        const {geoObjects} = await ymaps.geocode(coords),
            address = geoObjects.get(0).getAddressLine();

        this.geoCache.set(key, address);
        this.saveGeoCache();

        return address;
    }

    showMainBalloon({coords, address}) {
        this.yaMap.balloon.open(coords, {
            coords: coords,
            address: address,
            contentBody: this.renderReviewList(address)
        }, {
            layout: balloonTpl(),
            layoutContent: balloonReviewsTpl()
        });
    }

    renderReviewsList(reviewPoints) {
        return reviewPoints.reduce((str, {author, place, date, message}) => {
            str += `<div class="review"><b>${author}</b> ${place} ${date.toLocaleString()} <br> ${message}</div>`;
            return str;
        }, '');
    };

    getPointPlace(address) {
        return this.reviewPoints.filter(p => p.address === address);
    }

    renderReviewList(address) {
        const points = this.getPointPlace(address);
        return this.renderReviewsList(points);
    }

    createPlacePin(point) {
        const placeMark = new ymaps.Placemark(point.coords, {
            address: point.address,
            place: point.place,
            message: point.message,
            author: point.author,
            date: point.date,
            placemarkId: point.id
        });

        placeMark.events.add('click', () => {
            this.showMainBalloon({
                coords: point.coords, address: point.address
            });
        });

        this.cluster.add(placeMark);
    }

    getFormData(form) {
        const {message, name, place, long, lat, address} = form;

        return {
            coords: [lat.value, long.value],
            address: address.value,
            message: message.value,
            author: name.value,
            place: place.value,
        }
    }

    addPlaceReview({place, address, author, message, coords, date}) {
        const id = this.reviewPoints.length;

        const reviewPoint = new Point({coords, address, author, message, date, place, id});

        this.reviewPoints.push(reviewPoint);
        this.createPlacePin(reviewPoint);
    }
}
