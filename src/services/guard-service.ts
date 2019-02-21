import { BaseService } from './base-service';

export class GuardService extends BaseService {
  name = 'guard';
  dependencies = ['eventHandler'];
}
