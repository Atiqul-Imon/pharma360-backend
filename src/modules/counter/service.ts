import { Types } from 'mongoose';
import { getTenantModels, getAdminModels } from '../../database/index.js';
import { validate, ValidationError } from '../../shared/utils/validation.js';
import { CounterStatus, SubscriptionPlan } from '../../shared/types/index.js';
import { CreateCounterDTO, UpdateCounterDTO, CounterFilters } from './types.js';

interface PlanCounterLimit {
  [key: string]: number;
}

const COUNTER_LIMITS: PlanCounterLimit = {
  [SubscriptionPlan.BASIC]: 1,
  [SubscriptionPlan.PROFESSIONAL]: 2,
  [SubscriptionPlan.ENTERPRISE]: 4,
  [SubscriptionPlan.HOSPITAL]: 6,
};

class CounterService {
  async getCounters(
    tenantId: string,
    filters: CounterFilters = {}
  ): Promise<any[]> {
    const models = await getTenantModels(tenantId);
    const query: Record<string, any> = {};

    if (filters.status) {
      query.status = filters.status;
    }

    const counters = await models.Counter.find(query).sort({ createdAt: 1 });
    return counters;
  }

  async createCounter(
    tenantId: string,
    data: CreateCounterDTO
  ): Promise<any> {
    validate(
      { name: data.name },
      { name: { required: true, minLength: 2, maxLength: 50 } }
    );

    const models = await getTenantModels(tenantId);
    const currentCount = await models.Counter.countDocuments();

    const { Tenant } = getAdminModels();
    const tenant = await Tenant.findById(tenantId, 'subscriptionPlan');
    const plan = tenant?.subscriptionPlan || SubscriptionPlan.BASIC;

    if (currentCount >= (COUNTER_LIMITS[plan] || COUNTER_LIMITS[SubscriptionPlan.BASIC])) {
      throw new ValidationError({
        limit: `Counter limit reached for ${plan} plan`,
      });
    }

    const existing = await models.Counter.findOne({ name: data.name });
    if (existing) {
      throw new ValidationError({ name: 'Counter name already exists' });
    }

    const isDefault = data.isDefault || currentCount === 0;

    if (isDefault) {
      await models.Counter.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    }

    const counter = await models.Counter.create({
      name: data.name,
      isDefault,
      status: CounterStatus.ACTIVE,
    });

    return counter;
  }

  async updateCounter(
    tenantId: string,
    counterId: string,
    data: UpdateCounterDTO
  ): Promise<any> {
    if (!Types.ObjectId.isValid(counterId)) {
      throw new ValidationError({ counterId: 'Invalid counter ID' });
    }

    const models = await getTenantModels(tenantId);
    const counter = await models.Counter.findById(counterId);

    if (!counter) {
      throw new ValidationError({ counterId: 'Counter not found' });
    }

    if (data.name) {
      validate(
        { name: data.name },
        { name: { minLength: 2, maxLength: 50 } }
      );

      const existing = await models.Counter.findOne({ name: data.name, _id: { $ne: counterId } });
      if (existing) {
        throw new ValidationError({ name: 'Counter name already exists' });
      }

      counter.name = data.name;
    }

    if (data.status) {
      counter.status = data.status;
    }

    if (data.isDefault !== undefined) {
      if (data.isDefault) {
        await models.Counter.updateMany({ isDefault: true }, { $set: { isDefault: false } });
      }
      counter.isDefault = data.isDefault;
    }

    await counter.save();
    return counter;
  }

  async deleteCounter(tenantId: string, counterId: string): Promise<void> {
    if (!Types.ObjectId.isValid(counterId)) {
      throw new ValidationError({ counterId: 'Invalid counter ID' });
    }

    const models = await getTenantModels(tenantId);
    const counter = await models.Counter.findById(counterId);

    if (!counter) {
      throw new ValidationError({ counterId: 'Counter not found' });
    }

    if (counter.isDefault) {
      throw new ValidationError({ counterId: 'Default counter cannot be deleted' });
    }

    await models.Counter.findByIdAndDelete(counterId);
  }
}

export default new CounterService();

