import { getTenantModels } from '../../database/index.js';
import { validate, ValidationError } from '../../shared/utils/validation.js';
import { CreateCustomerDTO, UpdateCustomerDTO, AddDuePaymentDTO } from './types.js';

class CustomerService {
  async createCustomer(tenantId: string, data: CreateCustomerDTO): Promise<any> {
    validate(data, {
      name: { required: true, minLength: 2, maxLength: 100 },
      phone: { required: true, phone: true },
      email: { email: true },
    });

    const models = await getTenantModels(tenantId);

    const existingCustomer = await models.Customer.findOne({ phone: data.phone });
    if (existingCustomer) {
      throw new ValidationError({ phone: 'Phone number already registered' });
    }

    const customer = await models.Customer.create(data);
    return customer;
  }

  async getCustomers(tenantId: string, page: number = 1, limit: number = 50, search?: string): Promise<any> {
    const models = await getTenantModels(tenantId);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (search) {
      filter.$text = { $search: search };
    }

    const [customers, total] = await Promise.all([
      models.Customer.find(filter).skip(skip).limit(limit).sort({ totalPurchases: -1 }),
      models.Customer.countDocuments(filter),
    ]);

    return { customers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getCustomerById(tenantId: string, customerId: string): Promise<any> {
    const models = await getTenantModels(tenantId);
    const customer = await models.Customer.findById(customerId);

    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer;
  }

  async getCustomerByPhone(tenantId: string, phone: string): Promise<any> {
    const models = await getTenantModels(tenantId);
    const customer = await models.Customer.findOne({ phone });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer;
  }

  async updateCustomer(tenantId: string, customerId: string, data: UpdateCustomerDTO): Promise<any> {
    const models = await getTenantModels(tenantId);
    
    if (data.phone) {
      const existing = await models.Customer.findOne({ phone: data.phone, _id: { $ne: customerId } });
      if (existing) {
        throw new ValidationError({ phone: 'Phone number already in use' });
      }
    }

    const customer = await models.Customer.findByIdAndUpdate(customerId, { $set: data }, { new: true, runValidators: true });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer;
  }

  async deleteCustomer(tenantId: string, customerId: string): Promise<void> {
    const models = await getTenantModels(tenantId);
    
    const customer = await models.Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    if (customer.dueAmount > 0) {
      throw new Error('Cannot delete customer with outstanding dues');
    }

    await models.Customer.findByIdAndDelete(customerId);
  }

  async addDuePayment(tenantId: string, customerId: string, data: AddDuePaymentDTO): Promise<any> {
    validate(data, {
      amount: { required: true, min: 0.01 },
      paymentMethod: { required: true },
    });

    const models = await getTenantModels(tenantId);
    
    const customer = await models.Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    if (data.amount > customer.dueAmount) {
      throw new ValidationError({ amount: 'Payment amount exceeds due amount' });
    }

    customer.dueAmount -= data.amount;
    await customer.save();

    return customer;
  }

  async getCustomerPurchaseHistory(tenantId: string, customerId: string, page: number = 1, limit: number = 20): Promise<any> {
    const models = await getTenantModels(tenantId);
    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      models.Sale.find({ customerId }).skip(skip).limit(limit).sort({ saleDate: -1 }),
      models.Sale.countDocuments({ customerId }),
    ]);

    return { sales, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}

export default new CustomerService();

