const { AppBuilder } = require('denali-cli');

module.exports = class WebsiteBuilder extends AppBuilder {
  shouldBuildDocs() {
    return false;
  }
};
