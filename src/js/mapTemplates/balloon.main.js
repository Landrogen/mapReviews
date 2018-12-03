const balloonTpl = () => {
    const layout = ymaps.templateLayoutFactory.createClass('<div class="popup-form">' +
        '<a class="close" href="#">&times;</a>' +
        '<div class="">' +
        '<div class="review__header">{{address}}</div>' +
        '<div class="review__list">$[[options.contentLayout observeSize minWidth=380 maxWidth=380 maxHeight=150]]</div>' +
        '<form class=review-form id="review-from">' +
        '<h2 class="review-form__title">Ваш отзыв</h2>' +
        '<input type="hidden" name="lat" value="{{coords[0]}}">' +
        '<input type="hidden" name="long" value="{{coords[1]}}">' +
        '<input type="hidden" name="address" value="{{address}}">' +
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
                left: 30,
                top: -30
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

            const position = this._$element.position();

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
            return element && element[0];
        }
    });
    return layout;
};

export default balloonTpl;