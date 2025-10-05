import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import { ReportingStructure } from '../entities/reporting-structure.entity';

/**
 * Reporting Structure Repository - Handles employee-manager relationships
 * Manages hierarchical reporting structures with time-bound relationships
 */
@Injectable()
export class ReportingStructureRepository {
  constructor(
    @InjectRepository(ReportingStructure)
    private readonly repository: Repository<ReportingStructure>,
  ) {}

  /**
   * Create a new reporting relationship
   */
  async create(relationshipData: Partial<ReportingStructure>): Promise<ReportingStructure> {
    const relationship = this.repository.create(relationshipData);
    return await this.repository.save(relationship);
  }

  /**
   * Update an existing relationship
   */
  async update(id: string, updateData: Partial<ReportingStructure>): Promise<ReportingStructure> {
    await this.repository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Reporting structure with id ${id} not found`);
    }
    return updated;
  }

  /**
   * Find relationship by ID
   */
  async findById(id: string): Promise<ReportingStructure | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['employee', 'manager'],
    });
  }

  /**
   * Find current manager for an employee
   */
  async findCurrentManagerByEmployeeId(employeeId: string): Promise<ReportingStructure | null> {
    const currentDate = new Date();
    
    return await this.repository.findOne({
      where: {
        employeeId,
        startDate: LessThanOrEqual(currentDate),
        endDate: Or(IsNull(), MoreThanOrEqual(currentDate)),
      },
      relations: ['manager'],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Find all current team members for a manager
   */
  async findCurrentTeamByManagerId(managerId: string): Promise<ReportingStructure[]> {
    const currentDate = new Date();
    
    return await this.repository.find({
      where: {
        managerId,
        startDate: LessThanOrEqual(currentDate),
        endDate: Or(IsNull(), MoreThanOrEqual(currentDate)),
      },
      relations: ['employee'],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Get team member IDs for a manager
   */
  async getTeamMemberIds(managerId: string): Promise<string[]> {
    const teamMembers = await this.findCurrentTeamByManagerId(managerId);
    return teamMembers.map(member => member.employeeId);
  }

  /**
   * Find all reporting relationships for an employee (historical)
   */
  async findByEmployeeId(employeeId: string): Promise<ReportingStructure[]> {
    return await this.repository.find({
      where: { employeeId },
      relations: ['manager'],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Find all reporting relationships for a manager (historical)
   */
  async findByManagerId(managerId: string): Promise<ReportingStructure[]> {
    return await this.repository.find({
      where: { managerId },
      relations: ['employee'],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Check if a reporting relationship exists between two users at a specific date
   */
  async existsRelationship(
    employeeId: string,
    managerId: string,
    checkDate: Date = new Date(),
  ): Promise<boolean> {
    const relationship = await this.repository.findOne({
      where: {
        employeeId,
        managerId,
        startDate: LessThanOrEqual(checkDate),
        endDate: Or(IsNull(), MoreThanOrEqual(checkDate)),
      },
    });
    return !!relationship;
  }

  /**
   * End a reporting relationship by setting end date
   */
  async endRelationship(id: string, endDate: Date): Promise<ReportingStructure> {
    await this.repository.update(id, { endDate });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Reporting structure with id ${id} not found`);
    }
    return updated;
  }

  /**
   * Find active relationships that would create circular reporting
   */
  async findCircularRelationships(employeeId: string, managerId: string): Promise<boolean> {
    // Check if the proposed manager reports to the employee (direct or indirect)
    const managerReportsToEmployee = await this.repository
      .createQueryBuilder('rs')
      .where('rs.employeeId = :managerId', { managerId })
      .andWhere('rs.managerId = :employeeId', { employeeId })
      .andWhere('rs.startDate <= :currentDate', { currentDate: new Date() })
      .andWhere('(rs.endDate IS NULL OR rs.endDate >= :currentDate)', { currentDate: new Date() })
      .getOne();

    return !!managerReportsToEmployee;
  }

  /**
   * Get reporting hierarchy for an employee (up the chain)
   */
  async getReportingChain(employeeId: string, maxLevels: number = 10): Promise<ReportingStructure[]> {
    const chain: ReportingStructure[] = [];
    let currentEmployeeId = employeeId;
    let level = 0;

    while (level < maxLevels) {
      const manager = await this.findCurrentManagerByEmployeeId(currentEmployeeId);
      if (!manager) break;

      chain.push(manager);
      currentEmployeeId = manager.managerId;
      level++;

      // Prevent infinite loops
      if (chain.some(r => r.managerId === currentEmployeeId)) break;
    }

    return chain;
  }

  /**
   * Get all subordinates for a manager (down the chain)
   */
  async getAllSubordinates(managerId: string, maxLevels: number = 10): Promise<string[]> {
    const subordinates = new Set<string>();
    const toProcess = [managerId];
    let level = 0;

    while (toProcess.length > 0 && level < maxLevels) {
      const currentManagerId = toProcess.shift();
      if (!currentManagerId) break;
      const directReports = await this.getTeamMemberIds(currentManagerId);

      for (const employeeId of directReports) {
        if (!subordinates.has(employeeId)) {
          subordinates.add(employeeId);
          toProcess.push(employeeId); // This employee might also be a manager
        }
      }
      level++;
    }

    return Array.from(subordinates);
  }

  /**
   * Delete relationship
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Delete all relationships for an employee
   */
  async deleteByEmployeeId(employeeId: string): Promise<void> {
    await this.repository.delete({ employeeId });
  }

  /**
   * Delete all relationships for a manager
   */
  async deleteByManagerId(managerId: string): Promise<void> {
    await this.repository.delete({ managerId });
  }
}