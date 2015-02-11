/** @license
 * RequireJS plugin for async dependency load like JSONP and Google Maps
 * Author: Miller Medeiros
 * Version: 0.1.2 (2014/02/24)
 * Released under the MIT license
 */
define('requirejs-plugins/async',[],function(){

    var DEFAULT_PARAM_NAME = 'callback',
        _uid = 0;

    function injectScript(src){
        var s, t;
        s = document.createElement('script'); s.type = 'text/javascript'; s.async = true; s.src = src;
        t = document.getElementsByTagName('script')[0]; t.parentNode.insertBefore(s,t);
    }

    function formatUrl(name, id){
        var paramRegex = /!(.+)/,
            url = name.replace(paramRegex, ''),
            param = (paramRegex.test(name))? name.replace(/.+!/, '') : DEFAULT_PARAM_NAME;
        url += (url.indexOf('?') < 0)? '?' : '&';
        return url + param +'='+ id;
    }

    function uid() {
        _uid += 1;
        return '__async_req_'+ _uid +'__';
    }

    return{
        load : function(name, req, onLoad, config){
            if(config.isBuild){
                onLoad(null); //avoid errors on the optimizer
            }else{
                var id = uid();
                //create a global variable that stores onLoad so callback
                //function can define new module after async load
                window[id] = onLoad;
                injectScript(formatUrl(req.toUrl(name), id));
            }
        }
    };
});


define('provider/utils/gMaps',["requirejs-plugins/async!//maps.googleapis.com/maps/api/js?key=AIzaSyCOPhbBgg7Rb8SS_f4iC-w9zIB-vD44ZkQ&sensor=false"], function($__0) {
  
  if (!$__0 || !$__0.__esModule)
    $__0 = {default: $__0};
  $__0;
  var $__default = window.google.maps;
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});

define('provider/models/GeoLocation',["../utils/gMaps"], function($__0) {
  
  if (!$__0 || !$__0.__esModule)
    $__0 = {default: $__0};
  var gMaps = $__0.default;
  var LatLng = gMaps.LatLng;
  var _latLng = Symbol('_latLng', true);
  var GeoLocation = function GeoLocation(latitude, longitude, address, zip) {
    this[_latLng] = new gMaps.LatLng(latitude, longitude);
    this.address = address;
    this.zip = zip;
  };
  ($traceurRuntime.createClass)(GeoLocation, {
    get latLng() {
      return this[_latLng];
    },
    set latLng(value) {
      this[_latLng] = value;
    }
  }, {});
  var $__default = GeoLocation;
  Object.defineProperty(Object.getOwnPropertyDescriptor(GeoLocation.prototype, "latLng").set, "parameters", {get: function() {
      return [[LatLng]];
    }});
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});

define('provider/services/ProviderService',["../models/GeoLocation"], function($__0) {
  
  if (!$__0 || !$__0.__esModule)
    $__0 = {default: $__0};
  var GeoLocation = $__0.default;
  var PROVIDER_SEARCH_CONFIG = {BASE_API_URL: 'http://localhost:8080/<YourBaaS>/ProviderSearchAPI'};
  function ProviderRestangular(Restangular) {
    
    return Restangular.withConfig(function(RestangularConfigurer) {
      RestangularConfigurer.setBaseUrl(PROVIDER_SEARCH_CONFIG.BASE_API_URL);
      RestangularConfigurer.addResponseInterceptor(function(data, operation, what, url, response, deferred) {
        var extractedData;
        if (operation === 'getList' && data.hasOwnProperty('metadata')) {
          extractedData = data.records;
          extractedData.metadata = data.metadata;
        } else {
          extractedData = data;
        }
        return extractedData;
      });
    });
  }
  var PROVIDER_SEARCH_PARAMS = {
    pageSize: 33,
    offset: 0,
    sort: 'radius',
    order: 'asc',
    facets: 'PROV_GDR_CD,ADR_CTY_NM,SPCL_TYP_FULL_DESC',
    specialty: '',
    gender: '',
    address: '',
    radius: 50
  };
  var PROVIDER_SEARCH_GEOLOCATION = new GeoLocation();
  var _providerCache = Symbol('providers', true);
  var q = Symbol('q', true);
  var sanitize = Symbol('sanitize', true);
  var providerRestangular = Symbol('providerRestangular', true);
  var ProviderService = function ProviderService($q, $sanitize, ProviderRestangular, DSCacheFactory) {
    console.info('in ProviderService....');
    this[q] = $q;
    this[sanitize] = $sanitize;
    this[providerRestangular] = ProviderRestangular;
    this[_providerCache] = new DSCacheFactory('providerCache', {
      maxAge: 600000,
      deleteOnExpire: 'passive',
      onExpire: function(key, value) {
        console.log(("cache expired for drug key: " + key + ", value: " + value));
      }
    });
  };
  ($traceurRuntime.createClass)(ProviderService, {
    _sanitizeParams: function(geoLoc, params) {
      var sanitizedParams = {
        pageSize: params.pageSize,
        offset: params.offset,
        sort: params.sort,
        order: params.order,
        facets: params.facets,
        lat: geoLoc.latLng.lat(),
        lng: geoLoc.latLng.lng(),
        radius: params.radius
      };
      var query = '';
      if (params.specialty && params.specialty.length > 0) {
        query = (query + " AND specialty:\"" + params.specialty + "\"");
      }
      if (params.gender && params.gender.length > 0) {
        query = (query + " AND PROV_GDR_CD:\"" + params.gender + "\"");
      }
      if (query.startsWith(" AND")) {
        query = query.substring(4);
      }
      sanitizedParams.q = ("( " + query + " )");
      console.debug(sanitizedParams.q);
      console.log('sanitizedParams', sanitizedParams);
      return sanitizedParams;
    },
    searchProviders: function() {
      var geoLoc = arguments[0] !== (void 0) ? arguments[0] : PROVIDER_SEARCH_GEOLOCATION;
      var searchParams = arguments[1] !== (void 0) ? arguments[1] : PROVIDER_SEARCH_PARAMS;
      console.log('geoLoc', geoLoc);
      console.log('searchParams', searchParams);
      return this[providerRestangular].all('providers').getList(this._sanitizeParams(geoLoc, searchParams));
    },
    getProvider: function(providerId) {
      var $__2 = this;
      var promise = new Promise((function(resolve, reject) {
        var cachedProvider = $__2[_providerCache].get(providerId);
        if (cachedProvider) {
          resolve(cachedProvider);
        } else {
          $__2[providerRestangular].one('providers', providerId).get().then((function(provider) {
            $__2[_providerCache].put(providerId, provider);
            resolve(provider);
          })).catch((function(err) {
            console.error(err);
            reject(err);
          }));
        }
      }));
      return this[q].when(promise);
    }
  }, {});
  return {
    get PROVIDER_SEARCH_CONFIG() {
      return PROVIDER_SEARCH_CONFIG;
    },
    get ProviderRestangular() {
      return ProviderRestangular;
    },
    get PROVIDER_SEARCH_PARAMS() {
      return PROVIDER_SEARCH_PARAMS;
    },
    get PROVIDER_SEARCH_GEOLOCATION() {
      return PROVIDER_SEARCH_GEOLOCATION;
    },
    get ProviderService() {
      return ProviderService;
    },
    __esModule: true
  };
});

define('provider/routes',["./services/ProviderService"], function($__0) {
  
  if (!$__0 || !$__0.__esModule)
    $__0 = {default: $__0};
  var $__1 = $__0,
      PROVIDER_SEARCH_GEOLOCATION = $__1.PROVIDER_SEARCH_GEOLOCATION,
      PROVIDER_SEARCH_PARAMS = $__1.PROVIDER_SEARCH_PARAMS;
  function routes($stateProvider) {
    
    return $stateProvider.state('providers', {
      abstract: true,
      url: '/providers',
      templateUrl: 'provider/views/providers.html',
      resolve: {geolocation: ['GeolocationService', function(GeolocationService) {
          return GeolocationService.getGeolocation();
        }]}
    }).state('providers.search', {
      url: '',
      access: {
        allowAnonymous: false,
        roles: ['ROLE_USER']
      },
      resolve: {providers: ['ProviderService', 'angulargmUtils', 'geolocation', function(ProviderService, angulargmUtils, geolocation) {
          if (angulargmUtils.hasNaN(PROVIDER_SEARCH_GEOLOCATION.latLng)) {
            PROVIDER_SEARCH_GEOLOCATION.latLng = geolocation.latLng;
            PROVIDER_SEARCH_GEOLOCATION.address = geolocation.address;
          }
          return ProviderService.searchProviders();
        }]},
      views: {
        '@providers': {controller: function($scope, providers, ProviderService) {
            $scope.searchCollapsed = true;
            $scope.providers = providers.sort((function(a, b) {
              return a.addresses[0].distance - b.addresses[0].distance;
            }));
            $scope.doSearch = (function() {
              PROVIDER_SEARCH_PARAMS.offset = 0;
              ProviderService.searchProviders().then((function(providers) {
                $scope.providers = providers.sort((function(a, b) {
                  return a.addresses[0].distance - b.addresses[0].distance;
                }));
              }));
            });
          }},
        'filters@providers.search': {
          templateUrl: 'provider/views/providers.search.html',
          controller: 'ProviderSearchController as psc'
        },
        'map@providers.search': {
          templateUrl: 'provider/views/providers.map.html',
          controller: 'ProviderMapController as pmc'
        },
        'results@providers.search': {
          templateUrl: 'provider/views/providers.results.html',
          controller: 'ProviderResultsController as prc'
        }
      }
    }).state('providers.search.detail', {
      url: '/:providerId',
      resolve: {provider: ['ProviderService', '$stateParams', function(ProviderService, $stateParams) {
          return ProviderService.getProvider($stateParams.providerId);
        }]},
      views: {'details@providers.search': {
          templateUrl: 'provider/views/providers.detail.html',
          controller: 'ProviderDetailController as pdc'
        }}
    }).state('providers.detail', {
      url: '/detail/:providerId',
      resolve: {provider: ['ProviderService', '$stateParams', function(ProviderService, $stateParams) {
          return ProviderService.getProvider($stateParams.providerId);
        }]},
      views: {'details@providers': {
          templateUrl: 'provider/views/providers.detail.html',
          controller: 'ProviderDetailController as pdc'
        }}
    });
  }
  var $__default = routes;
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});

define('provider/controllers/ProviderSearchController',["../services/ProviderService"], function($__0) {
  
  if (!$__0 || !$__0.__esModule)
    $__0 = {default: $__0};
  var $__1 = $__0,
      PROVIDER_SEARCH_PARAMS = $__1.PROVIDER_SEARCH_PARAMS,
      PROVIDER_SEARCH_GEOLOCATION = $__1.PROVIDER_SEARCH_GEOLOCATION;
  var scope = Symbol('scope', true);
  var state = Symbol('state', true);
  var http = Symbol('http', true);
  var providerRestangular = Symbol('providerRestangular', true);
  var geocoderService = Symbol('geocoderService', true);
  var providerService = Symbol('providerService', true);
  var ProviderSearchController = function ProviderSearchController($scope, $http, $state, ProviderRestangular, GeocoderService, ProviderService) {
    var $__2 = this;
    console.log('in ProviderSearchController...');
    this[scope] = $scope;
    this[state] = $state;
    this[http] = $http;
    this[providerRestangular] = ProviderRestangular;
    this[geocoderService] = GeocoderService;
    this[providerService] = ProviderService;
    this.providerSearchParams = PROVIDER_SEARCH_PARAMS;
    this.providerSearchGeolocation = PROVIDER_SEARCH_GEOLOCATION;
    this.specialities = ['PEDIATRICS', 'CARDIOLOGY', 'NEPHROLOGY', 'CHIROPRACTIC MEDICINE'];
    this.status = {isopen: false};
    $scope.$parent.centerSearch = this.centerSearch;
    $scope.$parent.dbCursorMove = (function(n) {
      PROVIDER_SEARCH_PARAMS.offset = PROVIDER_SEARCH_PARAMS.offset + n;
      $__2[state].transitionTo($__2[state].current, null, {
        reload: true,
        inherit: true,
        notify: true
      });
    });
  };
  ($traceurRuntime.createClass)(ProviderSearchController, {
    setDistance: function(dist) {
      this.providerSearchParams.radius = dist;
      this.status.isopen = false;
    },
    onSelect: function($item, $model, $label) {
      this.providerSearchGeolocation.latLng = $model.geometry.location;
      this.providerSearchGeolocation.address = $model.formatted_address;
    },
    _getZip: function(address) {
      var addressComponents = address.address_components;
      var zippy = addressComponents.filter((function(i) {
        return i.types[0] === 'postal_code';
      }));
      if (undefined !== zippy && zippy.length > 0) {
        return zippy[0].long_name;
      }
    },
    dbCursorMove: function(n) {
      PROVIDER_SEARCH_PARAMS.offset = PROVIDER_SEARCH_PARAMS.offset + n;
      this[state].transitionTo(this[state].current, null, {
        reload: true,
        inherit: true,
        notify: true
      });
    },
    getLocations: function(address) {
      return this[geocoderService].getLocations(address);
    },
    getSpecialities: function(prefix) {
      var related = arguments[1] !== (void 0) ? arguments[1] : false;
      var n = arguments[2] !== (void 0) ? arguments[2] : 25;
      return this[providerRestangular].all('providers').all('specialties').getList({
        prefix: prefix,
        n: n,
        related: related
      });
    }
  }, {});
  var $__default = ProviderSearchController;
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});

define('provider/controllers/ProviderResultsController',[], function() {
  
  var ProviderResultsController = function ProviderResultsController($scope) {
    var $__0 = this;
    console.log('in ProviderResultsController...');
    this.currentPage = 1;
    this.itemsPerPage = 3;
    this.maxSize = 7;
    this.filterField = '';
    $scope.$watch('providers', function(newProviders) {
      console.log('providers in scope changed...');
      $scope.filteredProviders = newProviders;
    });
    $scope.filterProviders = (function() {
      $scope.filteredProviders = $scope.providers.filter((function(provider) {
        return ((provider.FST_NM || '') + ' ' + provider.LST_NM).contains($__0.filterField.toUpperCase());
      }));
    });
  };
  ($traceurRuntime.createClass)(ProviderResultsController, {}, {});
  var $__default = ProviderResultsController;
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});

define('provider/controllers/ProviderMapController',["../utils/gMaps", "../services/ProviderService"], function($__0,$__2) {
  
  if (!$__0 || !$__0.__esModule)
    $__0 = {default: $__0};
  if (!$__2 || !$__2.__esModule)
    $__2 = {default: $__2};
  var gMaps = $__0.default;
  var $__3 = $__2,
      PROVIDER_SEARCH_PARAMS = $__3.PROVIDER_SEARCH_PARAMS,
      PROVIDER_SEARCH_GEOLOCATION = $__3.PROVIDER_SEARCH_GEOLOCATION;
  var scope = Symbol('scope', true);
  var state = Symbol('state', true);
  var ProviderMapController = function ProviderMapController($scope, $state) {
    var $__4 = this;
    this[scope] = $scope;
    this[state] = $state;
    this.center = PROVIDER_SEARCH_GEOLOCATION;
    this.zoom = 13;
    this.bounds = this.getBounds($scope.providers);
    this.mapInitOptions = {
      zoom: this.zoom,
      center: this.bounds.getCenter(),
      mapTypeId: gMaps.MapTypeId.ROADMAP,
      panControl: false,
      zoomControlOptions: {
        style: gMaps.ZoomControlStyle.LARGE,
        position: gMaps.ControlPosition.RIGHT_BOTTOM
      }
    };
    this.markerOptions = {
      selected: {icon: 'common/images/hospital.png'},
      notselected: {icon: 'common/images/hospital_H_S_8x_2.png'},
      mouseover: {icon: 'common/images/hospital_H_search_L_8x_2.png'},
      mouseout: {icon: 'common/images/hospital_H_S_8x_2.png'}
    };
    this.mouseOverInfoWindowOptions = {pixelOffset: new google.maps.Size(120, 110)};
    this.selectedProvider = $scope.providers[0];
    this.selectedMarker = undefined;
    $scope.$watch('providers', (function(newProviders) {
      $__4.bounds = $__4.getBounds(newProviders);
    }));
  };
  ($traceurRuntime.createClass)(ProviderMapController, {
    getBounds: function(providers) {
      var bounds = new gMaps.LatLngBounds();
      for (var $__8 = providers[$traceurRuntime.toProperty(Symbol.iterator)](),
          $__9 = void 0; !($__9 = $__8.next()).done; ) {
        var provider = $__9.value;
        {
          for (var $__6 = provider.addresses[$traceurRuntime.toProperty(Symbol.iterator)](),
              $__7 = void 0; !($__7 = $__6.next()).done; ) {
            var address = $__7.value;
            {
              if (address.ADR_CANC_DT === '9999-12-31' && address.distance < PROVIDER_SEARCH_PARAMS.radius) {
                bounds.extend(new gMaps.LatLng(address.LAT_NBR, address.LONG_NBR));
              }
            }
          }
        }
      }
      return bounds;
    },
    onProviderClick: function(provider, marker) {
      this.selectedProvider = provider;
      PROVIDER_SEARCH_GEOLOCATION.latLng = new gMaps.LatLng(provider.addresses[0].LAT_NBR, provider.addresses[0].LONG_NBR);
      this[scope].markerEvents = [{
        event: 'openinfowindow',
        ids: [provider.id]
      }, {
        event: 'activatemarker',
        ids: [provider.id]
      }];
      this[state].go('providers.search.detail', {providerId: provider.id});
    },
    activateMarker: function(marker) {
      if (this.selectedMarker) {
        this.selectedMarker.setIcon(this.markerOptions.notselected.icon);
      }
      this.selectedMarker = marker;
      marker.setIcon(this.markerOptions.selected.icon);
    },
    onMouseOver: function(provider, marker) {
      console.log('onMouseOver');
    },
    onMouseOut: function(provider, marker) {
      console.log('onMouseOut');
    },
    markerAnimate: function(marker) {
      if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
      } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
      }
    },
    getProviderOpts: function(provider) {
      return angular.extend({
        title: (provider.FST_NM + " " + (provider.MDL_NM || '') + " " + provider.LST_NM),
        animation: gMaps.Animation.DROP
      }, this.markerOptions.notselected);
    }
  }, {});
  var $__default = ProviderMapController;
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});

define('provider/controllers/ProviderDetailController',[], function() {
  
  var ProviderDetailController = function ProviderDetailController($scope, provider) {
    this.selectedProvider = provider;
  };
  ($traceurRuntime.createClass)(ProviderDetailController, {}, {});
  var $__default = ProviderDetailController;
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});

define('provider/controllers/ProviderFacetsController',["../services/ProviderService"], function($__0) {
  
  if (!$__0 || !$__0.__esModule)
    $__0 = {default: $__0};
  var $__1 = $__0,
      PROVIDER_SEARCH_PARAMS = $__1.PROVIDER_SEARCH_PARAMS,
      PROVIDER_SEARCH_GEOLOCATION = $__1.PROVIDER_SEARCH_GEOLOCATION;
  var ProviderFacetsController = function ProviderFacetsController($scope, $state, $timeout, GeocoderService) {
    var $__2 = this;
    this.open = undefined;
    this.providerSearchParams = PROVIDER_SEARCH_PARAMS;
    $scope.genders = $scope.providers.metadata.facets.PROV_GDR_CD;
    $scope.cities = $scope.providers.metadata.facets.ADR_CTY_NM;
    $scope.specialties = $scope.providers.metadata.facets.SPCL_TYP_FULL_DESC;
    $scope.$watch('providers', (function(newProviders) {
      console.log('providers   changed... will update facets', newProviders.metadata.facets.PROV_GDR_CD);
      $scope.genders = newProviders.metadata.facets.PROV_GDR_CD;
      $scope.cities = newProviders.metadata.facets.ADR_CTY_NM;
      $scope.specialties = newProviders.metadata.facets.SPCL_TYP_FULL_DESC;
    }));
    $scope.$watch((function() {
      return $__2.open1;
    }), (function(newVal, oldVal) {
      return nv.graphs[0].update();
    }));
    $scope.$watch((function() {
      return $__2.open2;
    }), (function(newVal, oldVal) {
      return nv.graphs[1].update();
    }));
    $scope.$watch((function() {
      return $__2.open3;
    }), (function(newVal, oldVal) {
      return nv.graphs[2].update();
    }));
    $scope.$on('elementClick.directive', (function(angularEvent, event) {
      switch (angularEvent.targetScope.id) {
        case 'genders':
          PROVIDER_SEARCH_PARAMS.gender = event.label;
          $scope.doSearch();
          break;
        case 'specialties':
          PROVIDER_SEARCH_PARAMS.specialty = event.label;
          $scope.doSearch();
          break;
        case 'cities':
          GeocoderService.getLocations(event.label).then((function(add) {
            console.log(add[0].geometry.location);
            PROVIDER_SEARCH_GEOLOCATION.latLng = add[0].geometry.location;
            PROVIDER_SEARCH_GEOLOCATION.address = add[0].formatted_address;
            PROVIDER_SEARCH_PARAMS.address = add[0].formatted_address;
            $scope.doSearch();
          })).catch(console.error);
          break;
      }
    }));
    $scope.$on('legendClick.directive', (function(angularEvent, event) {
      console.log('legendClick event', event);
    }));
  };
  ($traceurRuntime.createClass)(ProviderFacetsController, {
    xFunction: function() {
      return (function(d) {
        return d.value;
      });
    },
    yFunction: function() {
      return (function(d) {
        return d.count;
      });
    },
    descriptionFunction: function() {
      return (function(d) {
        return d.value;
      });
    }
  }, {});
  var $__default = ProviderFacetsController;
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});

define('provider/services/GeolocationService',["../models/GeoLocation"], function($__0) {
  
  if (!$__0 || !$__0.__esModule)
    $__0 = {default: $__0};
  var GeoLocation = $__0.default;
  var q = Symbol('q', true);
  var http = Symbol('http', true);
  var _window = Symbol('_window', true);
  function TelizeRestangular(Restangular) {
    
    return Restangular.withConfig((function(RestangularConfigurer) {
      RestangularConfigurer.setBaseUrl('http://www.telize.com');
      RestangularConfigurer.setDefaultRequestParams();
      RestangularConfigurer.setJsonp(true);
      RestangularConfigurer.setDefaultRequestParams('jsonp', {callback: 'JSON_CALLBACK'});
    }));
  }
  var GeolocationService = function GeolocationService($q, $http, $window, TelizeRestangular) {
    console.info('in GeoIPService constructor....');
    this[q] = $q;
    this[http] = $http;
    this[_window] = $window;
    this.TelizeRestangular = TelizeRestangular;
    this.cachedGeolocation = null;
  };
  ($traceurRuntime.createClass)(GeolocationService, {
    getGeolocation: function() {
      var refresh = arguments[0] !== (void 0) ? arguments[0] : false;
      var $__2 = this;
      var promise = new Promise((function(resolve, reject) {
        if ($__2.cachedGeolocation && refresh === false) {
          resolve($__2.cachedGeolocation);
        } else {
          $__2.getGeolocationByIp().then((function(geoLoc) {
            $__2.cachedGeolocation = geoLoc;
            resolve(geoLoc);
          })).catch((function(err1) {
            console.log('error with getGeolocationByIp(), will try getGeolocationByHtml5()', err1);
            $__2.getGeolocationByHtml5().then((function(geoLoc) {
              $__2.cachedGeolocation = geoLoc;
              resolve(geoLoc);
            })).catch((function(err2) {
              console.log('error with getGeolocationByHtml5(), default to SF', err2);
              resolve(new GeoLocation(37.7577, -122.4376, 'San Francisco, CA', '94110'));
            }));
          }));
        }
      }));
      return promise;
    },
    getGeolocationByIp: function() {
      return this.TelizeRestangular.all('geoip').customGET().then((function(geoInfo) {
        if (!geoInfo.hasOwnProperty('postal_code')) {
          throw Error('Geolocation has not enough accuracy');
        }
        return new GeoLocation(geoInfo.latitude, geoInfo.longitude, geoInfo.city + ', ' + geoInfo.region_code, geoInfo.postal_code);
      }));
    },
    getGeolocationByHtml5: function() {
      var $__2 = this;
      return new Promise((function(resolve, reject) {
        if ($__2[_window].navigator && $__2[_window].navigator.geolocation) {
          $__2[_window].navigator.geolocation.getCurrentPosition((function(position) {
            resolve(new GeoLocation(position.coords.latitude, position.coords.longitude, '', ''));
          }), (function(error) {
            switch (error.code) {
              case error.PERMISSION_DENIED:
                reject(new Error('You have rejected access to your location'));
                break;
              case error.POSITION_UNAVAILABLE:
                reject(new Error('Unable to determine your location'));
                break;
              case error.TIMEOUT:
                reject(new Error('Service timeout has been reached'));
                break;
              default:
                reject(new Error('default error'));
            }
          }));
        } else {
          reject(new Error('Browser does not support location services'));
        }
      }));
    }
  }, {});
  return {
    get TelizeRestangular() {
      return TelizeRestangular;
    },
    get GeolocationService() {
      return GeolocationService;
    },
    __esModule: true
  };
});

define('provider/services/GeocoderService',["../utils/gMaps"], function($__0) {
  
  if (!$__0 || !$__0.__esModule)
    $__0 = {default: $__0};
  var gMaps = $__0.default;
  var GeocoderService = function GeocoderService() {
    console.info('in GeocoderService constructor....');
  };
  ($traceurRuntime.createClass)(GeocoderService, {getLocations: function(address) {
      return new Promise((function(resolve, reject) {
        var geocoder = new gMaps.Geocoder();
        return geocoder.geocode({
          'address': address,
          'region': 'us',
          componentRestrictions: {country: 'US'}
        }, function(results, status) {
          if (status === google.maps.GeocoderStatus.OK) {
            resolve(results);
          } else {
            throw Error('Geocode was not successful for the following reason: ' + status);
          }
        });
      }));
    }}, {});
  var $__default = GeocoderService;
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});

define('provider/utils/StartFromFilter',[], function() {
  
  function StartFromFilter() {
    
    return function(input, start) {
      start = +start;
      return input.slice(start);
    };
  }
  var $__default = StartFromFilter;
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});

define('provider/index',["./routes", "./controllers/ProviderSearchController", "./controllers/ProviderResultsController", "./controllers/ProviderMapController", "./controllers/ProviderDetailController", "./controllers/ProviderFacetsController", "./services/GeolocationService", "./services/GeocoderService", "./services/ProviderService", "./utils/StartFromFilter"], function($__0,$__2,$__4,$__6,$__8,$__10,$__12,$__14,$__16,$__18) {
  
  if (!$__0 || !$__0.__esModule)
    $__0 = {default: $__0};
  if (!$__2 || !$__2.__esModule)
    $__2 = {default: $__2};
  if (!$__4 || !$__4.__esModule)
    $__4 = {default: $__4};
  if (!$__6 || !$__6.__esModule)
    $__6 = {default: $__6};
  if (!$__8 || !$__8.__esModule)
    $__8 = {default: $__8};
  if (!$__10 || !$__10.__esModule)
    $__10 = {default: $__10};
  if (!$__12 || !$__12.__esModule)
    $__12 = {default: $__12};
  if (!$__14 || !$__14.__esModule)
    $__14 = {default: $__14};
  if (!$__16 || !$__16.__esModule)
    $__16 = {default: $__16};
  if (!$__18 || !$__18.__esModule)
    $__18 = {default: $__18};
  var routes = $__0.default;
  var ProviderSearchController = $__2.default;
  var ProviderResultsController = $__4.default;
  var ProviderMapController = $__6.default;
  var ProviderDetailController = $__8.default;
  var ProviderFacetsController = $__10.default;
  var $__13 = $__12,
      TelizeRestangular = $__13.TelizeRestangular,
      GeolocationService = $__13.GeolocationService;
  var GeocoderService = $__14.default;
  var $__17 = $__16,
      PROVIDER_SEARCH_CONFIG = $__17.PROVIDER_SEARCH_CONFIG,
      ProviderRestangular = $__17.ProviderRestangular,
      ProviderService = $__17.ProviderService;
  var StartFromFilter = $__18.default;
  var moduleName = 'spaApp.provider';
  var providerModule = angular.module(moduleName, ['restangular', 'ngTable', 'ui.bootstrap', 'AngularGM', 'truncate']);
  providerModule.factory('ProviderRestangular', ProviderRestangular);
  providerModule.factory('TelizeRestangular', TelizeRestangular);
  providerModule.service('GeolocationService', GeolocationService);
  providerModule.service('GeocoderService', GeocoderService);
  providerModule.service('ProviderService', ProviderService);
  providerModule.controller('ProviderSearchController', ProviderSearchController);
  providerModule.controller('ProviderResultsController', ProviderResultsController);
  providerModule.controller('ProviderMapController', ProviderMapController);
  providerModule.controller('ProviderDetailController', ProviderDetailController);
  providerModule.controller('ProviderFacetsController', ProviderFacetsController);
  providerModule.filter('startFrom', StartFromFilter);
  providerModule.config(routes);
  providerModule.config((function() {
    
    PROVIDER_SEARCH_CONFIG.BASE_API_URL = 'http://apsed2427:8080/api';
    PROVIDER_SEARCH_CONFIG.USERNAME = 'm360_stg_user';
    PROVIDER_SEARCH_CONFIG.PASSWORD = 'm360_stg_user';
  }));
  var $__default = moduleName;
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});

