define(["./Directive"], function($__0) {
  
  if (!$__0 || !$__0.__esModule)
    $__0 = {default: $__0};
  var Directive = $__0.default;
  var REQUIRED_PATTERNS = [/\d+/, /[a-z]+/, /[A-Z]+/, /\W+/, /^\S+$/];
  var PasswordValidator = function PasswordValidator() {
    $traceurRuntime.superConstructor($PasswordValidator).call(this);
    this.require = 'ngModel';
  };
  var $PasswordValidator = PasswordValidator;
  ($traceurRuntime.createClass)(PasswordValidator, {link: function(scope, element, attrs, ngModel) {
      $traceurRuntime.superGet(this, $PasswordValidator.prototype, "link").call(this, arguments);
      ngModel.$validators.passwordCharacters = (function(value) {
        var status = true;
        angular.forEach(REQUIRED_PATTERNS, (function(pattern) {
          status = status && pattern.test(value);
        }));
        return status;
      });
    }}, {}, Directive);
  var $__default = PasswordValidator;
  return {
    get default() {
      return $__default;
    },
    __esModule: true
  };
});
