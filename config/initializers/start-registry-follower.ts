import { lookup } from 'denali';

export default {
  name: 'follow-npm',
  async initialize() {
    lookup('service:registry-follower');
  }
};
