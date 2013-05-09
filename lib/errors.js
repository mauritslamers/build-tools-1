exports.ValidationError = SC.Error.extend({
  value: 400,
  label: "Validation Error",
  message: "Validation Error"
});

exports.NoAppsConfiguredError = SC.Error.extend({
  value: 401,
  label: "No apps configured",
  message: "No apps configured"
});