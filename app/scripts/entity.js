class API {
    constructor() {
        this.storage = localStorage;
        this.state = new Map();
    }



    getData() {
        this.state = JSON.parse(this.storage['geoObjects'] || '[]');
    }

    saveData() {
        this.storage['geoObjects'] = JSON.stringify([...this.state]);
    }
}

class Point {
    constructor(coords, address) {
        this.coords = coords;
        this.address = address;
        this.reviews = [];
    }

    addReview(review) {
        this.reviews.push(review);
    }
}

/**
 * Массив с точками и отзывами
 * @type {Point[]}
 */
const points = [];
/**
 * Карта точек и геообъектов на карте, для обновления содержимого баллунов
 * @type {Map<Point, ymaps.Placemark>}
 */
const pointsMap = new Map();
const api = new API();

let currentPoint;
let myMap;


function appInit() {
    // Загрузить отзывы из localStorage
    points.push(...api.getData());
}

ymaps.ready(init);

async function init() {
    myMap = new ymaps.Map("map", {
        center: [55.76, 37.64],
        zoom: 10
    });

    myMap.controls.add('zoomControl');

    const myClusterer = createCluster();

    myMap.geoObjects.add(myClusterer);

    const balloonForm = createBalloonForm();

    myMap.events.add('click', async (e) => {

        let coords = getCoordinates(e);

        myMap.balloon.open(coords, {
        },{
            balloonLayout: balloonForm,
        });

        const newPin = await createPin(coords, balloonForm);

        myClusterer.add(newPin);
    });
}

const createCluster = () =>{
    return new ymaps.Clusterer(
        {
            clusterDisableClickZoom: true,
            clusterBalloonContentLayout: 'cluster#balloonCarousel',
            clusterBalloonItemContentLayout: createClusterCarousel(),
            clusterBalloonPanelMaxMapArea: 0,
            clusterBalloonContentLayoutWidth: 200,
            clusterBalloonContentLayoutHeight: 130,
            clusterBalloonPagerSize: 5
        });
};

const createClusterCarousel = () => {
    return ymaps.templateLayoutFactory.createClass(
        '<div class=ballon_header>{{ properties.place|raw }}</div>' +
        '<a data-place-mark-id="{{properties.placemarkId}}" >{{ properties.address|raw }}</a>' +
        '<div class=ballon_body>{{ properties.reviews|raw }}</div>' +
        '<div class=ballon_footer>{{ properties.date|raw }}</div>'
    );
};


const createBalloonForm = () => {
    let layout = ymaps.templateLayoutFactory.createClass('<div class="popup-form">' +
        '<a class="close" href="#">&times;</a>' +
        '<div class="">' +
        '$[[options.contentLayout observeSize minWidth=380 maxWidth=380 maxHeight=530]]' +
        '<form class=review-form id="review-from">' +
        '<h2 class="review-form__title">Ваш отзыв</h2>' +
        '<input type="text" placeholder="Ваше имя" name="name" autocomplete="false">' +
        '<input type="text" placeholder="Укажите место" name="place" autocomplete="false">' +
        '<textarea type="text" placeholder="Поделитесь впечатлениями" name="message"></textarea>' +
        '<button class="add-review" data-add-review="true">Добавить</button>' +
        '</form>' +
        '</div>' +
        '</div>', {
        /**
         * Строит экземпляр макета на основе шаблона и добавляет его в родительский HTML-элемент.
         * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/layout.templateBased.Base.xml#build
         * @function
         * @name build
         */
        build: function () {
            this.constructor.superclass.build.call(this);

            this._$element = $('.popup-form', this.getParentElement());

            this.applyElementOffset();

            this._$element.find('.close')
                .on('click', $.proxy(this.onCloseClick, this));
        },

        /**
         * Удаляет содержимое макета из DOM.
         * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/layout.templateBased.Base.xml#clear
         * @function
         * @name clear
         */
        clear: function () {
            this._$element.find('.close')
                .off('click');

            this.constructor.superclass.clear.call(this);
        },

        /**
         * Метод будет вызван системой шаблонов АПИ при изменении размеров вложенного макета.
         * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/IBalloonLayout.xml#event-userclose
         * @function
         * @name onSublayoutSizeChange
         */
        onSublayoutSizeChange: function () {
            layout.superclass.onSublayoutSizeChange.apply(this, arguments);

            if (!this._isElement(this._$element)) {
                return;
            }

            this.applyElementOffset();

            this.events.fire('shapechange');
        },

        /**
         * Сдвигаем балун, чтобы "хвостик" указывал на точку привязки.
         * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/IBalloonLayout.xml#event-userclose
         * @function
         * @name applyElementOffset
         */
        applyElementOffset: function () {
            this._$element.css({
                left: -(this._$element[0].offsetWidth / 2),
                top: -(this._$element[0].offsetHeight)
            });
        },

        /**
         * Закрывает балун при клике на крестик, кидая событие "userclose" на макете.
         * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/IBalloonLayout.xml#event-userclose
         * @function
         * @name onCloseClick
         */
        onCloseClick: function (e) {
            e.preventDefault();

            this.events.fire('userclose');
        },

        /**
         * Используется для автопозиционирования (balloonAutoPan).
         * @see https://api.yandex.ru/maps/doc/jsapi/2.1/ref/reference/ILayout.xml#getClientBounds
         * @function
         * @name getClientBounds
         * @returns {Number[][]} Координаты левого верхнего и правого нижнего углов шаблона относительно точки привязки.
         */
        getShape: function () {
            if (!this._isElement(this._$element)) {
                return layout.superclass.getShape.call(this);
            }

            var position = this._$element.position();

            return new ymaps.shape.Rectangle(new ymaps.geometry.pixel.Rectangle([
                [position.left, position.top], [
                    position.left + this._$element[0].offsetWidth,
                    position.top + this._$element[0].offsetHeight
                ]
            ]));
        },

        /**
         * Проверяем наличие элемента (в ИЕ и Опере его еще может не быть).
         * @function
         * @private
         * @name _isElement
         * @param {jQuery} [element] Элемент.
         * @returns {Boolean} Флаг наличия.
         */
        _isElement: function (element) {
            return element && element[0] && element.find('.arrow')[0];
        }
    });

    return layout;
};

const getCoordinates = (e) => {
    return e.get('coords');
};

const addReviewToPoint = (point, form) => {
    const {message, name, place} = form;

    point.addReview({
        author: name.value,
        date: new Date(),
        place: place.value,
        message: message.value
    });

    if (point === currentPoint) {
        pointsMap.get(point).properties.set({
            balloonContentBody: renderReviewsList(point.reviews)
        });
    }
};

const renderReviewsList = (reviews) => {
    return reviews.reduce((str, {author, place, date, message}) => {
        str += `<div class="review"><b>${author}</b> ${place} ${date.toLocaleString()} <br> ${message}</div>`;

        return str;
    }, '');
};

document.addEventListener('click', (e) => {
    const {addReview} = e.target.dataset;
    if (addReview) {
        e.preventDefault();
        addReviewToPoint(currentPoint, e.target.closest('form'));
    }
});

const createPin = async (coords, balloonTemplate) => {
    const MyBalloonContentLayout = ymaps.templateLayoutFactory.createClass('' +
        '<div class=review__header>{{ properties.balloonContentHeader|raw }}</div>' +
        '<div class=review__list>{{ properties.balloonContentBody|raw }}</div>' +
        '<form class=review-form id="review-from">' +
        '<h2 class="review-form__title">Ваш отзыв</h2>' +
        '<input type="text" placeholder="Ваше имя" name="name" autocomplete="false">' +
        '<input type="text" placeholder="Укажите место" name="place" autocomplete="false">' +
        '<textarea type="text" placeholder="Поделитесь впечатлениями" name="message"></textarea>' +
        '<button class="add-review" data-add-review="true">Добавить</button>' +
        '</form>'
    );

    const newPin = new ymaps.Placemark(coords, {
        balloonHeader: 'Заголовок балуна',
        balloonContent: 'Контент балуна'
    }, {
        balloonLayout: balloonTemplate,
        balloonContentLayout: MyBalloonContentLayout,
    });

    const address = await getGeoAddress(coords),
        point = new Point(coords, address);

    newPin.properties.set({
        clusterCaption: address,
        balloonContentHeader: address,
        placemarkId: points.length,
        reviews: '',
        address: address
    });

    points.push(point);
    pointsMap.set(point, newPin);

    newPin.events.add('click', () => {
        currentPoint = point;
    });

    return newPin;
};

const getGeoAddress = async (coords) => {
    const {geoObjects} = await ymaps.geocode(coords);
    const firstObject = geoObjects.get(0);

    return firstObject.getAddressLine();
};