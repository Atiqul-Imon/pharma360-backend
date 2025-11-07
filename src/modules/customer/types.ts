export interface CreateCustomerDTO {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  dateOfBirth?: Date | string;
  gender?: 'male' | 'female' | 'other';
}

export interface UpdateCustomerDTO {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: Date | string;
  gender?: 'male' | 'female' | 'other';
  status?: 'active' | 'inactive' | 'vip';
}

export interface AddDuePaymentDTO {
  amount: number;
  paymentMethod: string;
  notes?: string;
}

// No default export needed - types are exported individually

