import { lookup } from '@denali-js/core';
import RepositoryPollerService from '../../app/services/repository-poller';

export default {
  name: 'start-repository-poller',
  async initialize() {
    let repositoryPoller = lookup<RepositoryPollerService>('service:repository-poller');
    repositoryPoller.start();
  }
};
