const clustererTpl = () => ymaps.templateLayoutFactory.createClass(
    '<div class="cluster-item"><div class=ballon_header>{{ properties.place|raw }}</div>' +
    '<a data-place-mark-id="{{properties.placemarkId}}" >{{ properties.address|raw }}</a>' +
    '<div class=ballon_body>{{ properties.message|raw }}</div>' +
    '<div class=ballon_footer>{{ properties.date|raw }}</div></div>'
);

export default clustererTpl;