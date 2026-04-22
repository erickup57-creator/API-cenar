import { Roles } from "../utils/enums/roles.js";

// Expose auth data in views.
export function attachAuthState(req, res, next) {
  const user = req.session?.user ?? null;
  res.locals.currentUser = user;
  res.locals.isAuthenticated = Boolean(user);
  next();
}

// Protect routes that require login.
export function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.redirect("/user/login");
  }

  next();
}

// Restrict route access to specific roles.
export function requireRole(...allowedRoles) {
  const normalizedRoles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;

  return (req, res, next) => {
    const userRole = req.session?.user?.role;

    if (!userRole || !normalizedRoles.includes(userRole)) {
      return res.redirect("/");
    }

    next();
  };
}

function resolveDashboardPathByRole(role) {
  switch (role) {
    case Roles.CLIENT:
      return "/client/dashboard";
    case Roles.DELIVERY:
      return "/delivery/dashboard";
    case Roles.COMMERCE:
      return "/commerce/dashboard";
    case Roles.ADMIN:
      return "/AdminDashboard";
    default:
      return "/";
  }
}

// Allow guest-only pages (login/register).
export function requireGuest(req, res, next) {
  const sessionUser = req.session?.user;

  if (sessionUser) {
    return res.redirect(resolveDashboardPathByRole(sessionUser.role));
  }

  next();
}
