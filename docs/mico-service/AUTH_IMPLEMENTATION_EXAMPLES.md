# Authentication Implementation Examples

## Complete Implementation Examples

### 1. Basic Attendance Service

#### Module Setup
```typescript
// attendance.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ServiceCommunicationModule } from '../service-communication/service-communication.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [AuthModule, ServiceCommunicationModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
```

#### Controller Implementation
```typescript
// attendance.controller.ts
import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard, BusinessAuthGuard, CurrentUser } from '../auth';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Public endpoint - no authentication required
  @Get('status')
  getServiceStatus() {
    return {
      service: 'attendance',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }

  // User authentication required - works with any token
  @Get('my-attendance')
  @UseGuards(JwtAuthGuard)
  async getMyAttendance(@CurrentUser() user: JwtPayload) {
    return this.attendanceService.getUserAttendance(user.id);
  }

  // Business context required - only works with business token
  @Get('business-attendance')
  @UseGuards(BusinessAuthGuard)
  async getBusinessAttendance(@CurrentUser() user: JwtPayload) {
    // user.businessId is guaranteed to exist here
    return this.attendanceService.getBusinessAttendance(user.businessId);
  }

  // Record attendance - requires business context
  @Post('record')
  @UseGuards(BusinessAuthGuard)
  async recordAttendance(
    @CurrentUser() user: JwtPayload,
    @Body() createAttendanceDto: CreateAttendanceDto,
  ) {
    return this.attendanceService.recordAttendance({
      ...createAttendanceDto,
      userId: user.id,
      businessId: user.businessId,
      recordedBy: user.id,
    });
  }

  // Get attendance for specific user - business context required
  @Get('user/:userId')
  @UseGuards(BusinessAuthGuard)
  async getUserAttendance(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.attendanceService.getUserAttendanceInBusiness(
      userId,
      user.businessId,
    );
  }
}
```

#### Service Implementation
```typescript
// attendance.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { BusinessService, UserService } from '../service-communication';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly businessService: BusinessService,
    private readonly userService: UserService,
  ) {}

  async getUserAttendance(userId: string) {
    // Fetch user data for display
    const userData = await this.userService.getUserData(userId);
    
    // Get attendance records (mock implementation)
    const attendanceRecords = await this.getAttendanceRecords(userId);

    return {
      user: {
        id: userId,
        name: userData?.name || 'Unknown User',
        avatar: userData?.avatar,
      },
      records: attendanceRecords,
      summary: this.calculateAttendanceSummary(attendanceRecords),
    };
  }

  async getBusinessAttendance(businessId: string) {
    // Fetch business data
    const businessData = await this.businessService.getBusinessData(businessId);
    
    if (!businessData) {
      throw new NotFoundException('Business not found');
    }

    // Get all attendance for this business (mock implementation)
    const attendanceRecords = await this.getBusinessAttendanceRecords(businessId);

    return {
      business: {
        id: businessId,
        name: businessData.name,
        avatar: businessData.avatar,
      },
      totalEmployees: attendanceRecords.length,
      presentToday: attendanceRecords.filter(r => r.status === 'present').length,
      absentToday: attendanceRecords.filter(r => r.status === 'absent').length,
      records: attendanceRecords,
    };
  }

  async recordAttendance(data: {
    userId: string;
    businessId: string;
    status: 'present' | 'absent' | 'late';
    timestamp?: Date;
    notes?: string;
    recordedBy: string;
  }) {
    // Fetch user and business data for validation and display
    const [userData, businessData] = await Promise.all([
      this.userService.getUserData(data.userId),
      this.businessService.getBusinessData(data.businessId),
    ]);

    if (!businessData) {
      throw new NotFoundException('Business not found');
    }

    // Create attendance record (mock implementation)
    const attendanceRecord = {
      id: `att_${Date.now()}`,
      userId: data.userId,
      userName: userData?.name || 'Unknown User',
      businessId: data.businessId,
      businessName: businessData.name,
      status: data.status,
      timestamp: data.timestamp || new Date(),
      notes: data.notes,
      recordedBy: data.recordedBy,
      createdAt: new Date(),
    };

    // Save to database (mock)
    await this.saveAttendanceRecord(attendanceRecord);

    this.logger.log(
      `Attendance recorded: ${userData?.name || data.userId} - ${data.status} at ${businessData.name}`,
    );

    return attendanceRecord;
  }

  async getUserAttendanceInBusiness(userId: string, businessId: string) {
    // Fetch user and business data
    const [userData, businessData] = await Promise.all([
      this.userService.getUserData(userId),
      this.businessService.getBusinessData(businessId),
    ]);

    if (!businessData) {
      throw new NotFoundException('Business not found');
    }

    // Get user's attendance in this specific business
    const attendanceRecords = await this.getUserAttendanceInBusinessRecords(
      userId,
      businessId,
    );

    return {
      user: {
        id: userId,
        name: userData?.name || 'Unknown User',
        avatar: userData?.avatar,
      },
      business: {
        id: businessId,
        name: businessData.name,
      },
      records: attendanceRecords,
      summary: this.calculateAttendanceSummary(attendanceRecords),
    };
  }

  // Mock implementations - replace with actual database operations
  private async getAttendanceRecords(userId: string) {
    // Mock data
    return [
      {
        id: 'att_1',
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        checkIn: '09:00',
        checkOut: '17:30',
      },
    ];
  }

  private async getBusinessAttendanceRecords(businessId: string) {
    // Mock data
    return [
      {
        userId: 'user_1',
        userName: 'John Doe',
        status: 'present',
        checkIn: '09:00',
        checkOut: null,
      },
    ];
  }

  private async getUserAttendanceInBusinessRecords(userId: string, businessId: string) {
    // Mock data
    return [
      {
        id: 'att_1',
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        checkIn: '09:00',
        checkOut: '17:30',
        businessId,
      },
    ];
  }

  private async saveAttendanceRecord(record: any) {
    // Mock save operation
    this.logger.debug('Saving attendance record', record);
  }

  private calculateAttendanceSummary(records: any[]) {
    return {
      totalDays: records.length,
      presentDays: records.filter(r => r.status === 'present').length,
      absentDays: records.filter(r => r.status === 'absent').length,
      lateDays: records.filter(r => r.status === 'late').length,
    };
  }
}
```

### 2. User Profile Service

```typescript
// user-profile.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService, BusinessService } from '../service-communication';

@Injectable()
export class UserProfileService {
  constructor(
    private readonly userService: UserService,
    private readonly businessService: BusinessService,
  ) {}

  async getUserProfile(userId: string) {
    const userData = await this.userService.getUserData(userId);
    
    if (!userData) {
      throw new NotFoundException('User not found');
    }

    return {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      avatar: userData.avatar,
      kahaId: userData.kahaId,
    };
  }

  async getUserBusinessProfile(userId: string, businessId: string) {
    // Fetch both user and business data
    const [userData, businessData] = await Promise.all([
      this.userService.getUserData(userId),
      this.businessService.getBusinessData(businessId),
    ]);

    if (!userData) {
      throw new NotFoundException('User not found');
    }

    if (!businessData) {
      throw new NotFoundException('Business not found');
    }

    return {
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        avatar: userData.avatar,
      },
      business: {
        id: businessData.id,
        name: businessData.name,
        avatar: businessData.avatar,
        address: businessData.address,
      },
      context: {
        userId,
        businessId,
        relationship: 'employee', // This would come from your business logic
      },
    };
  }

  async getBulkUserProfiles(userIds: string[]) {
    const usersMap = await this.userService.getBulkUserData(userIds);
    
    return userIds.map(userId => {
      const userData = usersMap.get(userId);
      return {
        id: userId,
        name: userData?.name || 'Unknown User',
        email: userData?.email,
        avatar: userData?.avatar,
        found: !!userData,
      };
    });
  }
}
```

### 3. Business Dashboard Service

```typescript
// business-dashboard.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessService, UserService } from '../service-communication';

@Injectable()
export class BusinessDashboardService {
  constructor(
    private readonly businessService: BusinessService,
    private readonly userService: UserService,
  ) {}

  async getBusinessDashboard(businessId: string, currentUserId: string) {
    // Fetch business data
    const businessData = await this.businessService.getBusinessData(businessId);
    
    if (!businessData) {
      throw new NotFoundException('Business not found');
    }

    // Get business statistics (mock implementation)
    const stats = await this.getBusinessStats(businessId);
    
    // Get recent activities (mock implementation)
    const recentActivities = await this.getRecentActivities(businessId);

    // Get current user info
    const currentUser = await this.userService.getUserData(currentUserId);

    return {
      business: {
        id: businessData.id,
        name: businessData.name,
        avatar: businessData.avatar,
        address: businessData.address,
      },
      currentUser: {
        id: currentUserId,
        name: currentUser?.name || 'Unknown User',
        avatar: currentUser?.avatar,
      },
      stats,
      recentActivities,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getBusinessTeam(businessId: string) {
    // Get business info
    const businessData = await this.businessService.getBusinessData(businessId);
    
    if (!businessData) {
      throw new NotFoundException('Business not found');
    }

    // Get team member IDs (this would come from your database)
    const teamMemberIds = await this.getTeamMemberIds(businessId);
    
    // Fetch all team member data in bulk
    const teamMembersMap = await this.userService.getBulkUserData(teamMemberIds);

    // Format team data
    const teamMembers = teamMemberIds.map(userId => {
      const userData = teamMembersMap.get(userId);
      return {
        id: userId,
        name: userData?.name || 'Unknown User',
        email: userData?.email,
        avatar: userData?.avatar,
        role: 'employee', // This would come from your business logic
        status: 'active', // This would come from your business logic
      };
    });

    return {
      business: {
        id: businessData.id,
        name: businessData.name,
      },
      teamMembers,
      totalMembers: teamMembers.length,
    };
  }

  // Mock implementations
  private async getBusinessStats(businessId: string) {
    return {
      totalEmployees: 25,
      presentToday: 22,
      absentToday: 3,
      lateToday: 2,
    };
  }

  private async getRecentActivities(businessId: string) {
    return [
      {
        id: 'act_1',
        type: 'attendance',
        message: 'John Doe checked in',
        timestamp: new Date(),
      },
    ];
  }

  private async getTeamMemberIds(businessId: string): Promise<string[]> {
    // This would query your database for team members
    return ['user_1', 'user_2', 'user_3'];
  }
}
```

### 4. Advanced Controller with Multiple Guards

```typescript
// advanced.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { 
  JwtAuthGuard, 
  BusinessAuthGuard, 
  OptionalJwtAuthGuard, 
  CurrentUser 
} from '../auth';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('advanced')
export class AdvancedController {
  // Public endpoint - no authentication
  @Get('public')
  getPublicData() {
    return { message: 'This is public data' };
  }

  // Optional authentication - personalized if authenticated
  @Get('personalized')
  @UseGuards(OptionalJwtAuthGuard)
  getPersonalizedData(@CurrentUser() user?: JwtPayload) {
    if (user) {
      return {
        message: `Hello ${user.id}!`,
        personalized: true,
        hasBusinessContext: !!user.businessId,
      };
    }
    
    return {
      message: 'Hello anonymous user!',
      personalized: false,
    };
  }

  // User authentication required
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getUserProfile(@CurrentUser() user: JwtPayload) {
    return {
      userId: user.id,
      kahaId: user.kahaId,
      hasBusinessContext: !!user.businessId,
      businessId: user.businessId || null,
    };
  }

  // Business context required
  @Get('business-data')
  @UseGuards(BusinessAuthGuard)
  getBusinessData(@CurrentUser() user: JwtPayload) {
    // user.businessId is guaranteed to exist
    return {
      message: 'Business-specific data',
      businessId: user.businessId,
      userId: user.id,
    };
  }

  // Create resource - business context required
  @Post('business-resource')
  @UseGuards(BusinessAuthGuard)
  createBusinessResource(
    @CurrentUser() user: JwtPayload,
    @Body() createDto: any,
  ) {
    return {
      message: 'Resource created',
      businessId: user.businessId,
      createdBy: user.id,
      data: createDto,
    };
  }

  // Update resource - business context required
  @Put('business-resource/:id')
  @UseGuards(BusinessAuthGuard)
  updateBusinessResource(
    @CurrentUser() user: JwtPayload,
    @Param('id') resourceId: string,
    @Body() updateDto: any,
  ) {
    return {
      message: 'Resource updated',
      resourceId,
      businessId: user.businessId,
      updatedBy: user.id,
      data: updateDto,
    };
  }

  // Delete resource - business context required
  @Delete('business-resource/:id')
  @UseGuards(BusinessAuthGuard)
  deleteBusinessResource(
    @CurrentUser() user: JwtPayload,
    @Param('id') resourceId: string,
  ) {
    return {
      message: 'Resource deleted',
      resourceId,
      businessId: user.businessId,
      deletedBy: user.id,
    };
  }

  // Search with optional filters
  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  searchData(
    @CurrentUser() user?: JwtPayload,
    @Query('q') query?: string,
    @Query('businessId') businessId?: string,
  ) {
    const searchContext = {
      query,
      authenticated: !!user,
      userId: user?.id,
      requestedBusinessId: businessId,
      userBusinessId: user?.businessId,
    };

    // Apply different search logic based on authentication
    if (user?.businessId) {
      // User has business context - search within their business
      return {
        message: 'Business-scoped search results',
        context: searchContext,
        scope: 'business',
      };
    } else if (user) {
      // User authenticated but no business context - limited search
      return {
        message: 'User-scoped search results',
        context: searchContext,
        scope: 'user',
      };
    } else {
      // Anonymous user - public search only
      return {
        message: 'Public search results',
        context: searchContext,
        scope: 'public',
      };
    }
  }
}
```

### 5. Error Handling Examples

```typescript
// error-handling.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { BusinessService, UserService } from '../service-communication';

@Injectable()
export class ErrorHandlingService {
  private readonly logger = new Logger(ErrorHandlingService.name);

  constructor(
    private readonly businessService: BusinessService,
    private readonly userService: UserService,
  ) {}

  async safeGetBusinessData(businessId: string) {
    try {
      const business = await this.businessService.getBusinessData(businessId);
      
      if (!business) {
        throw new NotFoundException(`Business with ID ${businessId} not found`);
      }

      return business;
    } catch (error) {
      this.logger.error(`Failed to fetch business data for ${businessId}`, error);
      
      if (error instanceof NotFoundException) {
        throw error; // Re-throw known errors
      }
      
      // Handle service communication errors gracefully
      throw new BadRequestException('Unable to fetch business data at this time');
    }
  }

  async safeGetUserData(userId: string) {
    try {
      const user = await this.userService.getUserData(userId);
      
      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        return null; // Return null instead of throwing for missing users
      }

      return user;
    } catch (error) {
      this.logger.error(`Failed to fetch user data for ${userId}`, error);
      return null; // Graceful degradation
    }
  }

  async safeBulkOperation(userIds: string[], businessIds: string[]) {
    try {
      // Perform bulk operations with error handling
      const [usersMap, businessesMap] = await Promise.allSettled([
        this.userService.getBulkUserData(userIds),
        this.businessService.getBulkBusinessData(businessIds),
      ]);

      const users = usersMap.status === 'fulfilled' ? usersMap.value : new Map();
      const businesses = businessesMap.status === 'fulfilled' ? businessesMap.value : new Map();

      // Log any failures
      if (usersMap.status === 'rejected') {
        this.logger.error('Failed to fetch user data in bulk', usersMap.reason);
      }
      
      if (businessesMap.status === 'rejected') {
        this.logger.error('Failed to fetch business data in bulk', businessesMap.reason);
      }

      return {
        users: Array.from(users.entries()).map(([id, data]) => ({ id, ...data })),
        businesses: Array.from(businesses.entries()).map(([id, data]) => ({ id, ...data })),
        errors: {
          usersFailed: usersMap.status === 'rejected',
          businessesFailed: businessesMap.status === 'rejected',
        },
      };
    } catch (error) {
      this.logger.error('Bulk operation failed completely', error);
      throw new BadRequestException('Unable to complete bulk operation');
    }
  }
}
```

These examples demonstrate:

1. **Complete service implementation** with proper error handling
2. **Multiple authentication patterns** (public, optional, required, business-context)
3. **Service communication** with external APIs
4. **Bulk operations** for performance
5. **Error handling strategies** for resilient services
6. **Real-world controller patterns** with different guard combinations
7. **Data transformation** and response formatting
8. **Logging and monitoring** best practices

Use these examples as templates for implementing authentication in your own microservices.