import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../shared/enums/user-role.enum';

export const ROLES_KEY = 'roles';

/** Restrict a route to specific user roles */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
