import { SetMetadata } from '@nestjs/common';

export const DESIGNATIONS_KEY = 'designations';

/**
 * @Designations('COORDINATOR', 'FACULTY') — restricts a route to users holding
 * at least one of the provided designation strings.
 */
export const Designations = (...designations: string[]) =>
  SetMetadata(DESIGNATIONS_KEY, designations);
