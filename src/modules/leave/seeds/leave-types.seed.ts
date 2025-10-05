import { DataSource } from 'typeorm';
import { LeaveType } from '../entities/leave-type.entity';

/**
 * Seed data for default leave types
 * Creates common leave types with standard configurations
 */
export const seedLeaveTypes = async (dataSource: DataSource): Promise<void> => {
  const leaveTypeRepository = dataSource.getRepository(LeaveType);

  // Check if leave types already exist
  const existingCount = await leaveTypeRepository.count();
  if (existingCount > 0) {
    console.log('Leave types already exist, skipping seed');
    return;
  }

  const defaultLeaveTypes = [
    {
      name: 'Annual Leave',
      description: 'Yearly vacation leave for rest and recreation',
      maxDaysPerYear: 25,
      requiresApproval: true,
      canCarryForward: true,
      maxCarryForwardDays: 5,
      minAdvanceNoticeDays: 7,
      isActive: true,
    },
    {
      name: 'Sick Leave',
      description: 'Medical leave for illness or health-related issues',
      maxDaysPerYear: 10,
      requiresApproval: false,
      canCarryForward: false,
      maxCarryForwardDays: 0,
      minAdvanceNoticeDays: 0,
      isActive: true,
    },
    {
      name: 'Personal Leave',
      description: 'Personal time off for individual matters',
      maxDaysPerYear: 5,
      requiresApproval: true,
      canCarryForward: false,
      maxCarryForwardDays: 0,
      minAdvanceNoticeDays: 3,
      isActive: true,
    },
    {
      name: 'Maternity Leave',
      description: 'Leave for new mothers',
      maxDaysPerYear: 90,
      requiresApproval: true,
      canCarryForward: false,
      maxCarryForwardDays: 0,
      minAdvanceNoticeDays: 30,
      isActive: true,
    },
    {
      name: 'Paternity Leave',
      description: 'Leave for new fathers',
      maxDaysPerYear: 14,
      requiresApproval: true,
      canCarryForward: false,
      maxCarryForwardDays: 0,
      minAdvanceNoticeDays: 30,
      isActive: true,
    },
    {
      name: 'Emergency Leave',
      description: 'Urgent leave for unexpected situations',
      maxDaysPerYear: 3,
      requiresApproval: true,
      canCarryForward: false,
      maxCarryForwardDays: 0,
      minAdvanceNoticeDays: 0,
      isActive: true,
    },
    {
      name: 'Bereavement Leave',
      description: 'Leave for mourning the loss of family members',
      maxDaysPerYear: 5,
      requiresApproval: true,
      canCarryForward: false,
      maxCarryForwardDays: 0,
      minAdvanceNoticeDays: 0,
      isActive: true,
    },
  ];

  try {
    for (const leaveTypeData of defaultLeaveTypes) {
      const leaveType = leaveTypeRepository.create(leaveTypeData);
      await leaveTypeRepository.save(leaveType);
      console.log(`Created leave type: ${leaveTypeData.name}`);
    }

    console.log('Leave types seeded successfully');
  } catch (error) {
    console.error('Error seeding leave types:', error);
    throw error;
  }
};