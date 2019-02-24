import {BaseService} from './base-service';

export class GuardService extends BaseService {
  get dependencies(): string[] {
    return ['eventHandler'];
  }
}
