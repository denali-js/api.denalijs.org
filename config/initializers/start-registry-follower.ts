import { lookup } from 'denali';

export default {
  name: 'follow-npm',
  // after: [ 'objection-connect' ],
  async initialize() {
    lookup('service:registry-follower');
  }
};
