import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Types } from 'mongoose';
import { mongoDBManager } from '../database/mongodb.js';
import { getAdminModels } from '../database/index.js';
import { hashPassword } from '../shared/utils/encryption.js';
import { UserRole } from '../shared/types/index.js';

dotenv.config();

async function ensureAdmin() {
  try {
    await mongoDBManager.connectAdmin();
    const { User } = getAdminModels();

    const existingAdmins = await User.find({ role: UserRole.ADMIN }).lean();

    if (existingAdmins.length > 0) {
      console.log(`✅ Found ${existingAdmins.length} admin account(s).`);
      existingAdmins.forEach((admin) => {
        console.log(`- Admin: ${admin.name} (${admin.email})`);
      });
      return;
    }

    const adminName = process.env.DEFAULT_ADMIN_NAME || 'Pharma360 Super Admin';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'superadmin@pharma360.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'SuperAdmin@123';
    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '+8801000000000';

    const hashedPassword = await hashPassword(adminPassword);

    await User.create({
      tenantId: new Types.ObjectId(),
      name: adminName,
      email: adminEmail.toLowerCase(),
      phone: adminPhone,
      password: hashedPassword,
      role: UserRole.ADMIN,
      permissions: ['*'],
      isActive: true,
      lastLogin: new Date(),
    });

    console.log('✅ Admin account created successfully.');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Temporary Password: ${adminPassword}`);
    console.log('⚠️ Please change the temporary password after first login.');
  } catch (error) {
    console.error('❌ Failed to ensure admin account:', error);
    process.exitCode = 1;
  } finally {
    await mongoDBManager.closeAll().catch((closeError) => {
      console.error('⚠️ Error while closing MongoDB connections:', closeError);
    });
    // mongoose maintains its own connections internally; ensure all are closed
    await mongoose.disconnect().catch((disconnectError) => {
      console.error('⚠️ Error during mongoose disconnect:', disconnectError);
    });
  }
}

ensureAdmin().catch((error) => {
  console.error('❌ Unexpected error ensuring admin account:', error);
  process.exit(1);
});


