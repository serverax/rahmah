/**
 * Role taxonomy for Sakina. Single source of truth so routes do not
 * spell role names by hand. Roles are intentionally narrow.
 *
 * Public users are NOT a role — they have no principal. Anything that
 * requires a principal must list an explicit role.
 */

export const ROLES = Object.freeze({
  PUBLIC_USER:      'public_user',
  USER:             'user',
  SHEIKH:           'sheikh',
  MODERATOR:        'moderator',
  CONTENT_REVIEWER: 'content_reviewer',
  CHARITY_ADMIN:    'charity_admin',
  ADMIN:            'admin',
});

export const ALL_ROLES = Object.freeze([
  ROLES.PUBLIC_USER,
  ROLES.USER,
  ROLES.SHEIKH,
  ROLES.MODERATOR,
  ROLES.CONTENT_REVIEWER,
  ROLES.CHARITY_ADMIN,
  ROLES.ADMIN,
]);

export const PRINCIPAL_ROLES = Object.freeze([
  ROLES.USER,
  ROLES.SHEIKH,
  ROLES.MODERATOR,
  ROLES.CONTENT_REVIEWER,
  ROLES.CHARITY_ADMIN,
  ROLES.ADMIN,
]);

export function isPrincipalRole(role) {
  return typeof role === 'string' && PRINCIPAL_ROLES.includes(role);
}

export function rolesEnabledSnapshot() {
  return Object.freeze({
    public_user:      true,
    user:             false,
    sheikh:           false,
    moderator:        false,
    content_reviewer: false,
    charity_admin:    false,
    admin:            false,
  });
}
