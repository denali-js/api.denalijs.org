import { lookup } from 'denali';
import RegistryFollowerService from '../../app/services/registry-follower';

export default {
  name: 'start-registry-follower',
  async initialize() {
    let registryFollower = lookup<RegistryFollowerService>('service:registry-follower');
    registryFollower.start();
  }
};
