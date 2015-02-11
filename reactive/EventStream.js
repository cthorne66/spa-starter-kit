define([], function() {
  
  var EVENT_STREAM_CONFIG = {
    BASE_URL: 'http://localhost:8080/<YourBaaS>/chunked',
    CONNECTION_OPTIONS: {headers: {}}
  };
  var cBaseUrl = Symbol('cBaseUrl', true);
  var cOptions = Symbol('cOptions', true);
  var EventStream = function EventStream() {
    var baseUrl = arguments[0] !== (void 0) ? arguments[0] : EVENT_STREAM_CONFIG.BASE_URL;
    var options = arguments[1] !== (void 0) ? arguments[1] : EVENT_STREAM_CONFIG.CONNECTION_OPTIONS;
    this[cBaseUrl] = baseUrl;
    this[cOptions] = options;
  };
  ($traceurRuntime.createClass)(EventStream, {}, {});
  Object.defineProperty(EventStream, "parameters", {get: function() {
      return [[$traceurRuntime.type.string], [Object]];
    }});
  return {
    get EVENT_STREAM_CONFIG() {
      return EVENT_STREAM_CONFIG;
    },
    get EventStream() {
      return EventStream;
    },
    __esModule: true
  };
});
