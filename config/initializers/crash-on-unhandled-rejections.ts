export default {
  name: 'crash-on-unhandled-rejections',
  async initialize() {
    process.on('unhandledRejection', (error) => { throw error; });
  }
};
