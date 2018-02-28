const { AppBuilder } = require('@denali-js/cli');

module.exports = class WebsiteBuilder extends AppBuilder {
  shouldBuildDocs() {
    return false;
  }
};
