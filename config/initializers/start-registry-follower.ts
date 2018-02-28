import { lookup } from '@denali-js/core';
import RegistryFollowerService from '../../app/services/registry-follower';

export default {
  name: 'start-registry-follower',
  async initialize() {
    let registryFollower = lookup<RegistryFollowerService>('service:registry-follower');
    registryFollower.start();
  }
};
